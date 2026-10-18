from app.models.alert import AlertSeverity
from app.schemas.alert import AlertCreate
from app.services.alert_service import create_alert


def test_alert_creation_extracts_iocs_and_scores(db_session):
    alert = create_alert(
        db_session,
        AlertCreate(
            title="Suspicious outbound transfer",
            description="Host sent traffic to 203.0.113.45 and malicious.example",
            severity=AlertSeverity.HIGH,
            source="SIEM",
            category="Data Exfiltration",
        ),
    )

    assert alert.priority_score > 0
    assert any(ioc["value"] == "203.0.113.45" for ioc in alert.iocs)
