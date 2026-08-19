"""
Creates the non-clustered index Browse Cars needs (filter on is_active,
sort by year) - SQLAlchemy only auto-creates PKs/FKs, not this. Without
it, that query was intermittently taking ~47s instead of ~1s. Idempotent,
safe to re-run.

Usage (from backend/, venv active, DATABASE_URL configured):
    python -m scripts.create_indexes
"""
from sqlalchemy import text

from app.database import SessionLocal

INDEXES = [
    # Matches the `WHERE is_active = 1 ORDER BY year DESC` pattern used by
    # list_cars() (both the default sort and the year_desc sort).
    ("IX_cars_year_active", "cars", "year, is_active"),
]


def main():
    db = SessionLocal()
    dialect = db.bind.dialect.name  # 'mssql' or 'postgresql', depending on DATABASE_URL
    try:
        for name, table, cols in INDEXES:
            if dialect == "postgresql":
                # Postgres has no NONCLUSTERED concept, and IF NOT EXISTS
                # covers idempotency natively - no separate existence check needed.
                db.execute(text(f"CREATE INDEX IF NOT EXISTS {name} ON {table} ({cols})"))
                db.commit()
                print(f"create/skip {name} ON {table} ({cols})")
                continue

            exists = db.execute(
                text("SELECT 1 FROM sys.indexes WHERE name = :name"),
                {"name": name},
            ).first()
            if exists:
                print(f"skip  {name} (already exists)")
                continue
            db.execute(text(f"CREATE NONCLUSTERED INDEX {name} ON {table} ({cols})"))
            db.commit()
            print(f"create {name} ON {table} ({cols})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
