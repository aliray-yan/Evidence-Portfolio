import csv
import html
import json
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.case import Case, CaseStatus
from app.models.ioc import IOCLookup
from app.models.report import Report, ReportStatus
from app.schemas.report import ReportGenerateRequest
from app.services.email_service import send_email_with_attachment
from app.utils.helpers import now_utc


REPORT_ROOT = Path("generated_reports")


def _rows_from_counts(rows) -> list[dict]:
    return [{"name": str(name.value if hasattr(name, "value") else name), "count": count} for name, count in rows]


def build_report_payload(db: Session, payload: ReportGenerateRequest) -> dict:
    severity_rows = db.execute(select(Alert.severity, func.count(Alert.id)).group_by(Alert.severity)).all()
    status_rows = db.execute(select(Alert.status, func.count(Alert.id)).group_by(Alert.status)).all()
    category_rows = db.execute(select(Alert.category, func.count(Alert.id)).group_by(Alert.category).order_by(func.count(Alert.id).desc()).limit(10)).all()
    source_rows = db.execute(select(Alert.source, func.count(Alert.id)).group_by(Alert.source).order_by(func.count(Alert.id).desc()).limit(10)).all()
    case_status_rows = db.execute(select(Case.status, func.count(Case.id)).group_by(Case.status)).all()
    critical_open = db.execute(
        select(func.count(Alert.id)).where(Alert.severity == AlertSeverity.CRITICAL, Alert.status.notin_([AlertStatus.CLOSED, AlertStatus.RESOLVED]))
    ).scalar_one()
    return {
        "name": payload.name,
        "type": payload.type.value,
        "generated_at": now_utc().isoformat(),
        "parameters": payload.parameters,
        "snapshot": {
            "alerts_total": db.execute(select(func.count(Alert.id))).scalar_one(),
            "alerts_critical_open": critical_open,
            "cases_open": db.execute(select(func.count(Case.id)).where(Case.status != CaseStatus.CLOSED)).scalar_one(),
            "cases_closed": db.execute(select(func.count(Case.id)).where(Case.status == CaseStatus.CLOSED)).scalar_one(),
            "iocs_enriched": db.execute(select(func.count(IOCLookup.id))).scalar_one(),
        },
        "breakdowns": {
            "alert_severity": _rows_from_counts(severity_rows),
            "alert_status": _rows_from_counts(status_rows),
            "case_status": _rows_from_counts(case_status_rows),
            "top_categories": _rows_from_counts(category_rows),
            "top_sources": _rows_from_counts(source_rows),
        },
    }


def _safe_name(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in {"-", "_"} else "-" for ch in value.lower()).strip("-") or "report"


def _write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _write_csv(path: Path, payload: dict) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["section", "metric", "value"])
        for key, value in payload["snapshot"].items():
            writer.writerow(["snapshot", key, value])
        for section, rows in payload["breakdowns"].items():
            for row in rows:
                writer.writerow([section, row["name"], row["count"]])


def _write_html(path: Path, payload: dict) -> None:
    sections = []
    for section, rows in payload["breakdowns"].items():
        row_html = "".join(f"<tr><td>{html.escape(row['name'])}</td><td>{row['count']}</td></tr>" for row in rows)
        sections.append(f"<h2>{html.escape(section.replace('_', ' ').title())}</h2><table>{row_html}</table>")
    snapshot = "".join(f"<tr><td>{html.escape(key)}</td><td>{value}</td></tr>" for key, value in payload["snapshot"].items())
    document = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>{html.escape(payload['name'])}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 40px; color: #0f172a; }}
    h1 {{ color: #1d4ed8; }}
    table {{ border-collapse: collapse; width: 100%; margin-bottom: 24px; }}
    td, th {{ border: 1px solid #cbd5e1; padding: 8px; text-align: left; }}
  </style>
</head>
<body>
  <h1>{html.escape(payload['name'])}</h1>
  <p>Generated at {html.escape(payload['generated_at'])}</p>
  <h2>Snapshot</h2>
  <table>{snapshot}</table>
  {''.join(sections)}
</body>
</html>"""
    path.write_text(document, encoding="utf-8")


def _pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _write_pdf(path: Path, payload: dict) -> None:
    lines = [payload["name"], f"Generated: {payload['generated_at']}", ""]
    lines.extend([f"{key}: {value}" for key, value in payload["snapshot"].items()])
    lines.append("")
    for section, rows in payload["breakdowns"].items():
        lines.append(section.replace("_", " ").title())
        lines.extend([f"- {row['name']}: {row['count']}" for row in rows])
        lines.append("")
    text_commands = ["BT", "/F1 11 Tf", "50 780 Td"]
    first = True
    for line in lines[:52]:
        if first:
            first = False
        else:
            text_commands.append("0 -14 Td")
        text_commands.append(f"({_pdf_escape(line)}) Tj")
    text_commands.append("ET")
    stream = "\n".join(text_commands).encode("latin-1", "replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    content = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(content))
        content.extend(f"{index} 0 obj\n".encode())
        content.extend(obj)
        content.extend(b"\nendobj\n")
    xref_offset = len(content)
    content.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        content.extend(f"{offset:010d} 00000 n \n".encode())
    content.extend(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF".encode())
    path.write_bytes(content)


WRITERS = {
    "json": _write_json,
    "csv": _write_csv,
    "html": _write_html,
    "pdf": _write_pdf,
}


def export_report_files(report: Report, payload: dict, formats: list[str]) -> dict[str, str]:
    report_dir = REPORT_ROOT / report.id
    report_dir.mkdir(parents=True, exist_ok=True)
    files: dict[str, str] = {}
    for fmt in formats:
        normalized = fmt.lower()
        writer = WRITERS.get(normalized)
        if not writer:
            continue
        path = report_dir / f"{_safe_name(report.name)}.{normalized}"
        writer(path, payload)
        files[normalized] = str(path)
    return files


def generate_report(db: Session, payload: ReportGenerateRequest, user_id: str | None) -> Report:
    report_payload = build_report_payload(db, payload)
    report = Report(
        name=payload.name,
        type=payload.type,
        parameters=report_payload,
        generated_by_id=user_id,
        status=ReportStatus.COMPLETED,
    )
    db.add(report)
    db.flush()
    files = export_report_files(report, report_payload, payload.formats)
    report.parameters = {**report_payload, "files": files}
    report.file_path = files.get("pdf") or files.get("html") or files.get("json")
    db.commit()
    db.refresh(report)

    if payload.email_recipients:
        attachment = files.get("pdf") or report.file_path
        send_email_with_attachment(payload.email_recipients, f"SecureOps Report: {report.name}", "Attached is your SecureOps report.", attachment)
    return report
