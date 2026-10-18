from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.playbook import Playbook, PlaybookExecution, PlaybookExecutionStep, PlaybookStep
from app.schemas.playbook import PlaybookCreate


PLAYBOOK_TEMPLATES = [
    {
        "name": "Phishing Email Investigation",
        "description": "Validate sender, enrich URLs, determine scope, contain mailboxes, and document impact.",
        "category": "Phishing",
        "trigger_conditions": {"category": "Phishing"},
        "steps": [
            ("Extract sender, URLs, and attachments", "Record all observable indicators from message headers and body.", "manual"),
            ("Check sender and URL reputation", "Run IOC enrichment for sender domain and URLs.", "automated"),
            ("Determine user impact", "Search for delivered copies and click telemetry.", "manual"),
            ("Contain and notify", "Quarantine messages, block indicators, and notify affected users.", "manual"),
            ("Document closure", "Record decision, scope, and lessons learned.", "manual"),
        ],
    },
    {
        "name": "Malware Detection Response",
        "description": "Triage endpoint malware alerts and drive containment through recovery.",
        "category": "Malware",
        "trigger_conditions": {"category": "Malware"},
        "steps": [
            ("Isolate affected endpoint", "Disconnect host from network or move to containment VLAN.", "manual"),
            ("Collect hash and process data", "Capture file hash, process tree, user, and endpoint metadata.", "manual"),
            ("Check malware reputation", "Lookup hash in MalwareBazaar and VirusTotal.", "automated"),
            ("Check lateral movement", "Review authentication and network activity from the host.", "manual"),
            ("Eradicate and recover", "Remove persistence, reimage if needed, and validate clean state.", "manual"),
        ],
    },
    {
        "name": "Brute Force Attack",
        "description": "Investigate repeated failed authentication and protect targeted accounts.",
        "category": "Brute Force",
        "trigger_conditions": {"category": "Brute Force"},
        "steps": [
            ("Confirm source and target", "Validate IP, account, protocol, and failure volume.", "manual"),
            ("Check source reputation", "Enrich source IP using AbuseIPDB, GreyNoise, and OTX.", "automated"),
            ("Review successful logins", "Search for success after failures and unusual geolocation.", "manual"),
            ("Contain", "Block source, reset credentials, and enforce MFA where needed.", "manual"),
        ],
    },
    {
        "name": "Data Exfiltration Alert",
        "description": "Validate abnormal outbound transfer and preserve evidence.",
        "category": "Data Exfiltration",
        "trigger_conditions": {"category": "Data Exfiltration"},
        "steps": [
            ("Validate data movement", "Confirm volume, destination, protocol, user, and asset role.", "manual"),
            ("Classify destination", "Enrich destination IP/domain and check sanctioned cloud services.", "automated"),
            ("Contain session", "Block transfer path and suspend suspected credentials if confirmed.", "manual"),
            ("Assess impact", "Identify data classification and reporting requirements.", "manual"),
        ],
    },
]


def create_playbook(db: Session, payload: PlaybookCreate, user_id: str | None) -> Playbook:
    playbook = Playbook(
        name=payload.name,
        description=payload.description,
        category=payload.category,
        trigger_conditions=payload.trigger_conditions,
        is_active=payload.is_active,
        created_by_id=user_id,
    )
    db.add(playbook)
    db.flush()
    for step in payload.steps:
        db.add(PlaybookStep(playbook_id=playbook.id, **step.model_dump()))
    db.commit()
    db.refresh(playbook)
    return playbook


def seed_playbooks(db: Session, user_id: str | None = None) -> int:
    existing = db.execute(select(Playbook.id).limit(1)).first()
    if existing:
        return 0
    created = 0
    for template in PLAYBOOK_TEMPLATES:
        payload = PlaybookCreate(
            name=template["name"],
            description=template["description"],
            category=template["category"],
            trigger_conditions=template["trigger_conditions"],
            steps=[
                {
                    "step_number": index + 1,
                    "title": title,
                    "description": description,
                    "step_type": step_type,
                    "expected_duration_minutes": 15,
                }
                for index, (title, description, step_type) in enumerate(template["steps"])
            ],
        )
        create_playbook(db, payload, user_id)
        created += 1
    return created


def start_execution(db: Session, playbook: Playbook, user_id: str | None, alert_id: str | None = None, case_id: str | None = None) -> PlaybookExecution:
    execution = PlaybookExecution(playbook_id=playbook.id, alert_id=alert_id, case_id=case_id, executed_by_id=user_id)
    db.add(execution)
    db.flush()
    for step in playbook.steps:
        db.add(PlaybookExecutionStep(execution_id=execution.id, step_id=step.id))
    db.commit()
    db.refresh(execution)
    return execution
