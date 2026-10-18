import smtplib
from email.message import EmailMessage
from pathlib import Path

from app.config import settings


def smtp_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


def send_email_with_attachment(
    recipients: list[str],
    subject: str,
    body: str,
    attachment_path: str | None = None,
) -> None:
    if not smtp_configured():
        raise RuntimeError("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.")

    message = EmailMessage()
    message["From"] = settings.smtp_user
    message["To"] = ", ".join(recipients)
    message["Subject"] = subject
    message.set_content(body)

    if attachment_path:
        path = Path(attachment_path)
        if path.exists():
            message.add_attachment(
                path.read_bytes(),
                maintype="application",
                subtype="octet-stream",
                filename=path.name,
            )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
        smtp.starttls()
        smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)
