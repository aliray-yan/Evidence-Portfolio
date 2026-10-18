from app.models.user import UserRole
from app.schemas.user import UserCreate
from app.services.auth_service import authenticate, create_user
from app.utils.security import create_access_token, decode_token


def test_user_can_authenticate(db_session):
    create_user(
        db_session,
        UserCreate(email="analyst@example.com", password="SecureOps!2026", full_name="Test Analyst", role=UserRole.ANALYST),
    )
    db_session.commit()

    user = authenticate(db_session, "analyst@example.com", "SecureOps!2026")

    assert user.email == "analyst@example.com"


def test_access_token_round_trip():
    token = create_access_token("user-1", "analyst")
    payload = decode_token(token)

    assert payload["sub"] == "user-1"
    assert payload["role"] == "analyst"
