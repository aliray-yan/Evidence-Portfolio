from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_analyst
from app.database import get_db
from app.models.report import Report, ScheduledReport
from app.models.user import User
from app.schemas.report import ReportEmailRequest, ReportGenerateRequest, ReportRead, ScheduledReportCreate, ScheduledReportRead
from app.services.email_service import send_email_with_attachment
from app.services.report_service import generate_report


router = APIRouter()


@router.get("", response_model=list[ReportRead])
def list_reports(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[Report]:
    return list(db.execute(select(Report).order_by(Report.generated_at.desc()).limit(100)).scalars().all())


@router.post("/generate", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def generate(payload: ReportGenerateRequest, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> Report:
    return generate_report(db, payload, current_user.id)


@router.get("/scheduled", response_model=list[ScheduledReportRead])
def scheduled(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[ScheduledReport]:
    return list(db.execute(select(ScheduledReport).order_by(ScheduledReport.report_type)).scalars().all())


@router.post("/scheduled", response_model=ScheduledReportRead, status_code=status.HTTP_201_CREATED)
def create_scheduled(payload: ScheduledReportCreate, db: Session = Depends(get_db), current_user: User = Depends(require_analyst)) -> ScheduledReport:
    row = ScheduledReport(**payload.model_dump(), created_by_id=current_user.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/scheduled/{report_id}", response_model=ScheduledReportRead)
def update_scheduled(report_id: str, payload: ScheduledReportCreate, db: Session = Depends(get_db), _: User = Depends(require_analyst)) -> ScheduledReport:
    row = db.get(ScheduledReport, report_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheduled report not found")
    for field, value in payload.model_dump().items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/scheduled/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scheduled(report_id: str, db: Session = Depends(get_db), _: User = Depends(require_analyst)) -> None:
    row = db.get(ScheduledReport, report_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheduled report not found")
    db.delete(row)
    db.commit()


@router.get("/{report_id}", response_model=ReportRead)
def get_report(report_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Report:
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report


@router.get("/{report_id}/download")
def download(report_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user), format: str = Query("json")):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    files = (report.parameters or {}).get("files", {})
    path = files.get(format)
    if path:
        media_types = {
            "json": "application/json",
            "csv": "text/csv",
            "html": "text/html",
            "pdf": "application/pdf",
        }
        return FileResponse(path, media_type=media_types.get(format, "application/octet-stream"))
    return Response(content=ReportRead.model_validate(report).model_dump_json(indent=2), media_type="application/json")


@router.post("/{report_id}/email")
def email_report(report_id: str, payload: ReportEmailRequest, db: Session = Depends(get_db), _: User = Depends(require_analyst)) -> dict:
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    files = (report.parameters or {}).get("files", {})
    attachment = files.get(payload.format) or report.file_path
    try:
        send_email_with_attachment(
            payload.recipients,
            payload.subject or f"SecureOps Report: {report.name}",
            payload.message or "Attached is your SecureOps report.",
            attachment,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {"ok": True, "sent_to": payload.recipients}
