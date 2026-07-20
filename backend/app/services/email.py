import logging
import smtplib
from email.message import EmailMessage

from app.database import settings

logger = logging.getLogger(__name__)


def send_reset_email(to_email: str, reset_link: str) -> None:
    if not settings.SMTP_EMAIL or not settings.SMTP_APP_PASSWORD:
        logger.warning("SMTP not configured; skipping reset email to %s. Link: %s", to_email, reset_link)
        return

    msg = EmailMessage()
    msg["Subject"] = "Reset your AutoVerse password"
    msg["From"] = settings.SMTP_EMAIL
    msg["To"] = to_email
    msg.set_content(
        "We received a request to reset your AutoVerse password.\n\n"
        f"Reset it here (valid for 30 minutes):\n{reset_link}\n\n"
        "If you didn't request this, you can safely ignore this email."
    )

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.SMTP_EMAIL, settings.SMTP_APP_PASSWORD)
            server.send_message(msg)
    except Exception:
        logger.exception("Failed to send reset email to %s", to_email)
