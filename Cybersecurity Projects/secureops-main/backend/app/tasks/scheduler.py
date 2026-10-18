try:  # pragma: no cover - preferred path
    from apscheduler.schedulers.background import BackgroundScheduler
except ModuleNotFoundError:  # pragma: no cover
    BackgroundScheduler = None

from app.config import settings
from app.database import SessionLocal
from app.tasks.alert_generator import generate_alert_batch


class _NoopScheduler:
    running = False

    def add_job(self, *args, **kwargs) -> None:
        return None

    def start(self) -> None:
        self.running = True

    def shutdown(self, wait: bool = False) -> None:
        self.running = False


scheduler = BackgroundScheduler(timezone="UTC") if BackgroundScheduler else _NoopScheduler()


def start_scheduler() -> None:
    if scheduler.running:
        return
    if not settings.seed_on_startup or settings.sample_alerts_on_startup <= 0:
        return

    def _job() -> None:
        db = SessionLocal()
        try:
            generate_alert_batch(db, settings.sample_alerts_on_startup)
        finally:
            db.close()

    scheduler.add_job(_job, "interval", minutes=15, id="sample-alert-generator", replace_existing=True)
    scheduler.start()


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
