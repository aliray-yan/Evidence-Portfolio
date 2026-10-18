from app.models.alert import AlertSeverity
from app.schemas.ingest import EDRAlertIn
from app.services.alert_service import upsert_alert_by_source_ref
from app.services.edr_normalizer import normalize_edr_alert


def test_edr_payload_maps_to_alert_create():
    alert = normalize_edr_alert(
        EDRAlertIn(
            alert_id="edr-1",
            title="EDR malware blocked",
            severity=AlertSeverity.CRITICAL,
            category="Malware",
            device_id="device-1",
            platform="android",
            hostname="WKS-FINANCE-01",
            package_name="com.example.malware",
            file_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            raw_event={"engine": "unit-test"},
        )
    )

    assert alert.source == "EDR"
    assert alert.source_ref == "edr-1"
    assert any(ioc.value == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" for ioc in alert.iocs)
    assert any(ioc.type == "package" and ioc.value == "com.example.malware" for ioc in alert.iocs)


def test_ihadrs_payload_maps_mobile_context():
    alert = normalize_edr_alert(
        EDRAlertIn(
            alert_id="ihadrs-app-risk-com.whatsapp",
            title="Risky app behavior",
            severity=AlertSeverity.HIGH,
            category="Endpoint Detection",
            event_type="ihadrs_threat",
            package_name="com.whatsapp",
            raw_event={
                "category": "MALICIOUS_APP",
                "risk_score": 100,
                "triggered_rules": ["APP-001"],
                "mitre_techniques": ["T1476"],
                "remediation": ["Review sensitive permissions"],
            },
        )
    )

    assert alert.category == "Malware"
    assert "Risk score: 100" in alert.description
    assert "MITRE: T1476" in alert.description
    assert any(ioc.type == "package" and ioc.value == "com.whatsapp" for ioc in alert.iocs)


def test_edr_upsert_is_idempotent_by_source_ref(db_session):
    first_payload = normalize_edr_alert(
        EDRAlertIn(alert_id="mobile-retry-1", title="Mobile alert", severity=AlertSeverity.MEDIUM, hostname="Pixel-1")
    )
    first, created = upsert_alert_by_source_ref(db_session, first_payload)

    second_payload = normalize_edr_alert(
        EDRAlertIn(alert_id="mobile-retry-1", title="Mobile alert updated", severity=AlertSeverity.HIGH, hostname="Pixel-1")
    )
    second, updated_created = upsert_alert_by_source_ref(db_session, second_payload)

    assert created is True
    assert updated_created is False
    assert first.id == second.id
    assert second.title == "Mobile alert updated"
    assert second.severity == AlertSeverity.HIGH
