"""
One-time fix: the initial Postgres migration used ingest.py, which re-reads
car_dataset_india.csv from scratch - but that CSV is the original, unfixed
scrape, and ingest.py never even reads image columns at all. Over this
project's history, pipeline/fix_*.py, refresh_*.py, and fetch_images*.py
scripts corrected bad scraped values (price, fuel_type, year, mileage, etc.)
and populated real per-car photos directly against MSSQL - none of that
ever made it back into the CSV. Re-running ingest.py against Postgres
silently brought back the pre-cleanup values and left every base car's
image_url/gallery_images NULL (falling back to a generic per-brand stock
photo in the UI).

This copies the corrected field values straight from MSSQL to Postgres,
matched by id (both databases loaded the same CSV in the same order, so ids
1-10000 line up exactly). Only touches the fields the cleanup pipeline
actually changes - brand_id, model, is_active, view_count, compare_count
are left untouched.

Usage (from backend/, venv active, DATABASE_URL pointed at Postgres):
    python -m scripts.fix_base_cars_from_mssql
"""
from sqlalchemy import create_engine, text

from app.database import engine as pg_engine

MSSQL_URL = (
    "mssql+pyodbc:///?odbc_connect=DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=DESKTOP-QD1BPL8;DATABASE=AutoVerse;Trusted_Connection=yes"
)

FIELDS = [
    "year", "fuel_type", "transmission", "price", "mileage", "engine_cc",
    "seats", "service_cost", "image_url", "gallery_images",
]


def main():
    mssql_engine = create_engine(MSSQL_URL)

    with mssql_engine.connect() as mssql_conn:
        rows = mssql_conn.execute(text(
            f"SELECT id, {', '.join(FIELDS)} FROM cars WHERE id <= 10000"
        )).mappings().all()
    print(f"Read {len(rows)} base rows from MSSQL")

    with pg_engine.begin() as pg_conn:
        set_clause = ", ".join(f"{f} = :{f}" for f in FIELDS)
        for row in rows:
            pg_conn.execute(text(
                f"UPDATE cars SET {set_clause} WHERE id = :id"
            ), dict(row))

    print(f"Done. Corrected {len(rows)} rows in Postgres.")


if __name__ == "__main__":
    main()
