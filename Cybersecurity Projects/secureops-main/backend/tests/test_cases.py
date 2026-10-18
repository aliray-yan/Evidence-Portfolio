from app.models.case import CaseSeverity
from app.schemas.case import CaseCreate
from app.services.case_service import create_case


def test_case_creation_generates_number_and_sla(db_session):
    case = create_case(
        db_session,
        CaseCreate(
            title="Malware incident",
            description="Endpoint malware response",
            severity=CaseSeverity.HIGH,
            priority=2,
            category="Malware",
        ),
        user_id=None,
    )

    assert case.case_number.startswith("INC-")
    assert case.sla_deadline is not None
