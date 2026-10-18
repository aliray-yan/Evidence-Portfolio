from sqlalchemy.orm import Session

from app.services.alert_service import generate_sample_alerts


def generate_alert_batch(db: Session, target_count: int = 120) -> int:
    return generate_sample_alerts(db, target_count)
