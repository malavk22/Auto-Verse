"""
Admin utility: sets a user's password directly in the database, bypassing
the email-based reset flow entirely. Useful for test/local accounts whose
email address isn't real (so "Forgot Password" has nowhere to send the link).

Prompts for the new password interactively (hidden input) instead of taking
it as a CLI argument or file value, so it's never typed into a script or
logged anywhere - same hashing (bcrypt) the real signup flow uses.

Usage (from backend/, venv active):
    python -m scripts.set_password <username>
"""
import sys
from getpass import getpass

from app.database import SessionLocal
from app.models.user import User
from app.services.auth import hash_password


def main():
    if len(sys.argv) != 2:
        print("Usage: python -m scripts.set_password <username>")
        sys.exit(1)

    username = sys.argv[1]
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"No user found with username {username!r}")
            sys.exit(1)

        pw1 = getpass("New password: ")
        pw2 = getpass("Confirm: ")
        if pw1 != pw2:
            print("Passwords didn't match - nothing changed.")
            sys.exit(1)
        if len(pw1) < 6:
            print("Password must be at least 6 characters - nothing changed.")
            sys.exit(1)

        user.password_hash = hash_password(pw1)
        db.commit()
        print(f"Password updated for {username!r}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
