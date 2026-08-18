"""
Creates the non-clustered indexes the `cars` table needs but doesn't get
from the SQLAlchemy models (SQLAlchemy only auto-creates PKs/FKs on
`Base.metadata.create_all()`, never secondary indexes).

Without this, `cars` has only its clustered PK (on `id`). Every Browse
Cars request filters on `is_active` and sorts by `year` (the default
sort, and the fallback for unrecognized `sort` values) - with no
supporting index, SQL Server has to do a full clustered-index scan +
sort for that shape of query, and was intermittently landing on a very
badly-costed plan for it (~47s instead of ~1s). Adding this index was
what actually fixed that; this script just makes the fix reproducible
if the database is ever rebuilt from scratch, instead of only existing
as a manual change against the live DB.

Idempotent: skips creation if the index already exists, so it's safe to
run again (e.g. as a post-seed step) without erroring.

Usage (from backend/, with the venv active and DATABASE_URL configured):
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
    try:
        for name, table, cols in INDEXES:
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
