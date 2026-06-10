"""
One-time script: loads car_dataset_india.csv into MSSQL.
Run from the backend/ directory:
    python ingest.py

Prerequisites:
  - .env file with DATABASE_URL set
  - MSSQL database 'autoverse' already created in SSMS
  - ODBC Driver 17 for SQL Server installed
"""

import csv
import sys
from decimal import Decimal, InvalidOperation

from app.database import engine, Base, SessionLocal
from app.models.car import Brand, Car

CSV_PATH = "car_dataset_india.csv"


def parse_decimal(value: str) -> Decimal | None:
    try:
        return Decimal(value.strip()) if value.strip() else None
    except InvalidOperation:
        return None


def parse_int(value: str) -> int | None:
    try:
        return int(value.strip()) if value.strip() else None
    except ValueError:
        return None


def main():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

    db = SessionLocal()
    try:
        # Check if data already loaded
        existing = db.query(Car).count()
        if existing > 0:
            print(f"Data already loaded ({existing} cars). Skipping. Delete rows first to re-ingest.")
            return

        brand_cache: dict[str, Brand] = {}

        with open(CSV_PATH, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        print(f"Loading {len(rows)} rows...")

        for row in rows:
            brand_name = row["Brand"].strip()

            if brand_name not in brand_cache:
                brand = db.query(Brand).filter(Brand.name == brand_name).first()
                if not brand:
                    brand = Brand(name=brand_name)
                    db.add(brand)
                    db.flush()
                brand_cache[brand_name] = brand

            car = Car(
                brand_id=brand_cache[brand_name].id,
                model=row["Model"].strip(),
                year=parse_int(row["Year"]),
                fuel_type=row["Fuel_Type"].strip() or None,
                transmission=row["Transmission"].strip() or None,
                price=parse_decimal(row["Price"]),
                mileage=parse_decimal(row["Mileage"]),
                engine_cc=parse_int(row["Engine_CC"]),
                seats=parse_int(row["Seating_Capacity"]),
                service_cost=parse_decimal(row["Service_Cost"]),
            )
            db.add(car)

        db.commit()
        print(f"Done. {len(rows)} cars loaded into MSSQL.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
