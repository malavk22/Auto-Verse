import logging
import smtplib
from email.message import EmailMessage

from app.database import settings

logger = logging.getLogger(__name__)


def _plain_text(username: str, email: str, reset_link: str) -> str:
    return (
        f"Hi {username},\n\n"
        f"We received a request to reset the password for your AutoVerse account ({email}).\n\n"
        f"Reset it here (valid for 30 minutes):\n{reset_link}\n\n"
        "If you didn't request this, you can safely ignore this email — your password won't be changed.\n\n"
        "— AutoVerse"
    )


def _html(username: str, email: str, reset_link: str) -> str:
    # Table-based layout with every rule inlined - the only way to look
    # right across Gmail, Outlook desktop (renders via Word's engine, so
    # <style> blocks and modern CSS are unreliable) and mobile mail apps.
    return f"""\
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#F7FAFA;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7FAFA;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr>
              <td style="background-color:#1A7A7A;padding:28px 32px;">
                <span style="font-size:20px;font-weight:700;color:#FFFFFF;">Auto<span style="color:#F5A623;">Verse</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#111827;">Reset your password</h1>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">Hi {username},</p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#374151;">
                  We received a request to reset the password for your AutoVerse account
                  (<strong>{email}</strong>). Click the button below to choose a new one.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:8px;background-color:#1A7A7A;">
                      <a href="{reset_link}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6B7280;">
                  This link expires in 30 minutes. If the button doesn't work, copy and paste this URL into your browser:
                </p>
                <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all;color:#1A7A7A;">
                  <a href="{reset_link}" style="color:#1A7A7A;">{reset_link}</a>
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">
                  If you didn't request a password reset, you can safely ignore this email — your password won't be changed.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#F7FAFA;border-top:1px solid #E0EEEE;">
                <p style="margin:0;font-size:12px;color:#9CA3AF;">
                  This is an automated message from AutoVerse. Please don't reply to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def send_reset_email(to_email: str, reset_link: str, username: str = "") -> None:
    if not settings.SMTP_EMAIL or not settings.SMTP_APP_PASSWORD:
        logger.warning("SMTP not configured; skipping reset email to %s. Link: %s", to_email, reset_link)
        return

    display_name = username or to_email.split("@")[0]

    msg = EmailMessage()
    msg["Subject"] = "Reset your AutoVerse password"
    msg["From"] = f"AutoVerse <{settings.SMTP_EMAIL}>"
    msg["To"] = to_email
    # Plain text first as the fallback, then an HTML alternative on top -
    # clients that render HTML show that; anything that can't (or a user
    # who's set their client to plain text) falls back automatically.
    msg.set_content(_plain_text(display_name, to_email, reset_link))
    msg.add_alternative(_html(display_name, to_email, reset_link), subtype="html")

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
            server.login(settings.SMTP_EMAIL, settings.SMTP_APP_PASSWORD)
            server.send_message(msg)
    except Exception:
        logger.exception("Failed to send reset email to %s", to_email)
