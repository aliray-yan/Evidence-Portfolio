import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.alert import Alert, AlertComment, AlertHistory, AlertStatus
from app.models.case import Case, CaseTask, CaseTimeline
from app.models.playbook import PlaybookExecution, PlaybookExecutionStep
from app.models.user import User
from app.services.enrichment_service import enrich_ioc
from app.utils.helpers import now_utc


SUPPORTED_ACTIONS = [
    {
        "id": "summarize_alert",
        "label": "Summarize alert",
        "fields": [],
    },
    {
        "id": "extract_edr_context",
        "label": "Extract EDR context",
        "fields": [],
    },
    {
        "id": "enrich_alert_iocs",
        "label": "Enrich alert IOCs",
        "fields": ["limit"],
    },
    {
        "id": "add_alert_comment",
        "label": "Add alert comment",
        "fields": ["comment"],
    },
    {
        "id": "set_alert_status",
        "label": "Set alert status",
        "fields": ["status"],
    },
    {
        "id": "create_case_task",
        "label": "Create case task",
        "fields": ["title", "description"],
    },
]


def automation_actions() -> list[dict[str, Any]]:
    return SUPPORTED_ACTIONS


def _get_alert(db: Session, execution: PlaybookExecution) -> Alert:
    if not execution.alert_id:
        raise ValueError("This automation requires a linked alert")
    alert = db.get(Alert, execution.alert_id)
    if not alert:
        raise ValueError("Linked alert was not found")
    return alert


def _get_case(db: Session, execution: PlaybookExecution) -> Case:
    if not execution.case_id:
        raise ValueError("This automation requires a linked case")
    case = db.get(Case, execution.case_id)
    if not case:
        raise ValueError("Linked case was not found")
    return case


def _raw_payload(alert: Alert) -> dict:
    if not alert.raw_log:
        return {}
    try:
        return json.loads(alert.raw_log)
    except json.JSONDecodeError:
        return {"raw_log": alert.raw_log}


def _format_template(template: str, alert: Alert, execution: PlaybookExecution) -> str:
    return template.format(
        alert_id=alert.id,
        alert_title=alert.title,
        severity=alert.severity.value,
        status=alert.status.value,
        category=alert.category,
        source=alert.source,
        source_ref=alert.source_ref or "",
        playbook_id=execution.playbook_id,
    )


async def run_automation_step(
    db: Session,
    execution: PlaybookExecution,
    execution_step: PlaybookExecutionStep,
    user: User,
) -> dict[str, Any]:
    step = execution_step.step
    config = step.automation_config or {}
    action = config.get("action") or "summarize_alert"

    result: dict[str, Any] = {
        "action": action,
        "ran_at": now_utc().isoformat(),
        "step_id": step.id,
    }

    if action == "summarize_alert":
        alert = _get_alert(db, execution)
        result["alert"] = {
            "id": alert.id,
            "title": alert.title,
            "severity": alert.severity.value,
            "status": alert.status.value,
            "source": alert.source,
            "source_ref": alert.source_ref,
            "category": alert.category,
            "priority_score": alert.priority_score,
            "ioc_count": len(alert.iocs or []),
        }
        return result

    if action == "extract_edr_context":
        alert = _get_alert(db, execution)
        raw = _raw_payload(alert)
        raw_event = raw.get("raw_event") if isinstance(raw.get("raw_event"), dict) else {}
        result["edr"] = {
            "device_id": raw.get("device_id") or raw_event.get("device_id"),
            "hostname": raw.get("hostname") or raw_event.get("hostname"),
            "platform": raw.get("platform") or raw_event.get("platform"),
            "package_name": raw.get("package_name") or raw_event.get("package_name"),
            "process_name": raw.get("process_name") or raw_event.get("process_name"),
            "event_type": raw.get("event_type") or raw_event.get("event_type"),
            "risk_score": raw_event.get("risk_score"),
            "triggered_rules": raw_event.get("triggered_rules") or [],
            "mitre_techniques": raw_event.get("mitre_techniques") or [],
            "remediation": raw_event.get("remediation") or [],
        }
        return result

    if action == "enrich_alert_iocs":
        alert = _get_alert(db, execution)
        limit = max(1, min(25, int(config.get("limit") or 5)))
        enrichable = [ioc for ioc in (alert.iocs or []) if ioc.get("type") in {"ip", "domain", "url", "hash_md5", "hash_sha1", "hash_sha256", "email", "cve"}]
        enriched = []
        for ioc in enrichable[:limit]:
            enriched.append(await enrich_ioc(db, ioc["value"], ioc.get("type")))
        result["enriched"] = enriched
        result["requested"] = len(enrichable[:limit])
        return result

    if action == "add_alert_comment":
        alert = _get_alert(db, execution)
        template = config.get("comment") or "Playbook automation completed for {alert_title}."
        comment = _format_template(template, alert, execution)
        db.add(AlertComment(alert_id=alert.id, user_id=user.id, comment=comment))
        db.add(AlertHistory(alert_id=alert.id, user_id=user.id, field_changed="comment", old_value=None, new_value=comment[:250]))
        result["comment"] = comment
        return result

    if action == "set_alert_status":
        alert = _get_alert(db, execution)
        status_value = config.get("status") or AlertStatus.INVESTIGATING.value
        try:
            next_status = AlertStatus(status_value)
        except ValueError as exc:
            raise ValueError(f"Unsupported alert status: {status_value}") from exc
        previous = alert.status
        if previous != next_status:
            alert.status = next_status
            alert.updated_at = now_utc()
            db.add(AlertHistory(alert_id=alert.id, user_id=user.id, field_changed="status", old_value=previous.value, new_value=next_status.value))
        result["old_status"] = previous.value
        result["new_status"] = next_status.value
        return result

    if action == "create_case_task":
        case = _get_case(db, execution)
        title = config.get("title") or step.title
        description = config.get("description") or step.description
        task = CaseTask(case_id=case.id, title=title, description=description, assigned_to_id=user.id)
        db.add(task)
        db.flush()
        db.add(
            CaseTimeline(
                case_id=case.id,
                user_id=user.id,
                event_type="task_created",
                description=f"Automation created task: {title}",
                new_value=task.id,
            )
        )
        result["task"] = {"id": task.id, "title": title}
        return result

    raise ValueError(f"Unsupported automation action: {action}")
