"""
One-time migration: copies users and favorites from the old MSSQL database
to the new PostgreSQL database. Cars/brands were already migrated via the
seed pipeline (ingest.py + scripts/) - that pipeline never touches accounts,
so real user data needs this separate pass.

Preserves original user/favorite IDs so favorites' foreign keys still line
up without remapping, then resets Postgres's auto-increment sequences so
future signups don't collide with the migrated IDs.

Idempotent: ON CONFLICT DO NOTHING means re-running this is safe.

Usage (from backend/, venv active, DATABASE_URL in .env pointed at Postgres):
    python -m scripts.migrate_users_favorites
"""
from sqlalchemy import create_engine, text

from app.database import engine as pg_engine

# Trusted_Connection=yes - Windows Authentication, no password needed.
MSSQL_URL = (
    "mssql+pyodbc:///?odbc_connect=DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=DESKTOP-QD1BPL8;DATABASE=AutoVerse;Trusted_Connection=yes"
)


def main():
    mssql_engine = create_engine(MSSQL_URL)

    with mssql_engine.connect() as mssql_conn, pg_engine.begin() as pg_conn:
        users = mssql_conn.execute(text(
            "SELECT id, username, email, password_hash, created_at, "
            "reset_token, reset_token_expires FROM users"
        )).mappings().all()
        print(f"Found {len(users)} users in MSSQL")
        for u in users:
            pg_conn.execute(text(
                "INSERT INTO users (id, username, email, password_hash, created_at, "
                "reset_token, reset_token_expires) "
                "VALUES (:id, :username, :email, :password_hash, :created_at, "
                ":reset_token, :reset_token_expires) "
                "ON CONFLICT (id) DO NOTHING"
            ), dict(u))

        favorites = mssql_conn.execute(text(
            "SELECT id, user_id, car_id, created_at FROM favorites"
        )).mappings().all()
        print(f"Found {len(favorites)} favorites in MSSQL")
        for f in favorites:
            pg_conn.execute(text(
                "INSERT INTO favorites (id, user_id, car_id, created_at) "
                "VALUES (:id, :user_id, :car_id, :created_at) "
                "ON CONFLICT (id) DO NOTHING"
            ), dict(f))

        # Postgres's own SERIAL sequences don't know about these explicitly-
        # inserted IDs - without this, the next real signup could collide
        # with a migrated id.
        pg_conn.execute(text(
            "SELECT setval(pg_get_serial_sequence('users','id'), "
            "COALESCE((SELECT MAX(id) FROM users), 1))"
        ))
        pg_conn.execute(text(
            "SELECT setval(pg_get_serial_sequence('favorites','id'), "
            "COALESCE((SELECT MAX(id) FROM favorites), 1))"
        ))

    print(f"Done. Migrated {len(users)} users, {len(favorites)} favorites.")


if __name__ == "__main__":
    main()
