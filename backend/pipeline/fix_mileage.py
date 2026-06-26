"""
Sets realistic mileage per model × fuel_type combination.

- Petrol/Diesel/CNG: random within a realistic kmpl range (ARAI-certified)
- Electric: NULL (range is in km, not kmpl — kept separate from this field)

Run from the backend/ directory:
    python pipeline/fix_mileage.py
"""

from __future__ import annotations

import random
import sys

sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.car import Car

# (min_kmpl, max_kmpl) — real ARAI figures ± small variance across variants
# Electric models are excluded (their field stays NULL)
MILEAGE_RANGES: dict[str, dict[str, tuple[float, float]]] = {

    # ── Honda ──────────────────────────────────────────────────────────────
    "Amaze":    {"Petrol": (18.6, 20.5), "Diesel": (24.0, 27.4)},
    "City":     {"Petrol": (17.0, 18.4), "Diesel": (23.5, 24.1)},
    "Civic":    {"Petrol": (16.5, 17.8), "Diesel": (23.0, 26.8)},
    "Jazz":     {"Petrol": (16.0, 17.1)},
    "WR-V":     {"Petrol": (16.5, 17.5), "Diesel": (23.7, 25.5)},

    # ── Hyundai ────────────────────────────────────────────────────────────
    "i10":      {"Petrol": (19.0, 20.7), "Diesel": (24.0, 27.7), "CNG": (30.5, 33.0)},
    "i20":      {"Petrol": (19.6, 20.4), "Diesel": (24.0, 26.3)},
    "Venue":    {"Petrol": (17.1, 18.7), "Diesel": (23.2, 25.3), "CNG": (27.0, 29.5)},
    "Verna":    {"Petrol": (17.5, 18.6), "Diesel": (23.0, 25.0)},
    "Creta":    {"Petrol": (16.8, 17.4), "Diesel": (21.4, 22.0)},

    # ── Kia ────────────────────────────────────────────────────────────────
    "Seltos":   {"Petrol": (16.5, 18.4), "Diesel": (21.0, 23.0)},
    "Sonet":    {"Petrol": (17.0, 18.2), "Diesel": (24.1, 25.0), "CNG": (27.0, 28.9)},
    "Carens":   {"Petrol": (16.5, 17.9), "Diesel": (20.5, 21.9)},
    "Carnival": {"Diesel": (13.5, 14.7)},

    # ── Mahindra ───────────────────────────────────────────────────────────
    "Bolero":   {"Diesel": (16.0, 17.5)},
    "Scorpio":  {"Petrol": (14.0, 15.3), "Diesel": (15.0, 16.4)},
    "Thar":     {"Petrol": (15.2, 16.0), "Diesel": (15.0, 16.0)},
    "XUV300":   {"Petrol": (17.0, 18.2), "Diesel": (20.0, 21.5)},
    "XUV700":   {"Petrol": (15.0, 16.5), "Diesel": (16.0, 17.9)},

    # ── Maruti Suzuki ──────────────────────────────────────────────────────
    "Swift":    {"Petrol": (21.2, 23.2), "CNG": (30.9, 32.7)},
    "Baleno":   {"Petrol": (22.4, 23.9), "CNG": (30.6, 31.5)},
    "Dzire":    {"Petrol": (23.3, 24.1), "CNG": (31.1, 33.5)},
    "WagonR":   {"Petrol": (24.4, 25.2), "CNG": (32.5, 34.0)},
    "Ertiga":   {"Petrol": (20.3, 21.0), "CNG": (26.1, 26.9)},

    # ── Renault ────────────────────────────────────────────────────────────
    "Kwid":     {"Petrol": (22.0, 23.0)},
    "Triber":   {"Petrol": (19.0, 20.0)},
    "Kiger":    {"Petrol": (19.9, 20.5)},
    "Duster":   {"Petrol": (13.0, 14.0), "Diesel": (19.0, 20.4)},
    "Lodgy":    {"Petrol": (15.0, 17.0), "Diesel": (19.0, 21.1)},

    # ── Skoda ──────────────────────────────────────────────────────────────
    "Rapid":    {"Petrol": (15.0, 16.5), "Diesel": (21.0, 22.5)},
    "Octavia":  {"Petrol": (16.4, 17.2)},
    "Superb":   {"Petrol": (14.7, 15.8)},
    "Kushaq":   {"Petrol": (16.5, 18.4)},
    "Slavia":   {"Petrol": (17.2, 19.0)},

    # ── Tata Motors ────────────────────────────────────────────────────────
    "Tiago":    {"Petrol": (19.8, 21.0), "CNG": (26.0, 28.1)},
    "Altroz":   {"Petrol": (19.9, 21.0), "Diesel": (24.5, 26.2), "CNG": (25.0, 27.3)},
    "Punch":    {"Petrol": (18.0, 20.1), "CNG": (24.0, 26.1)},
    # Nexon Electric handled separately — NULL
    "Nexon":    {"Petrol": (17.0, 18.3), "Diesel": (21.5, 23.2), "Electric": None},
    "Harrier":  {"Petrol": (14.0, 15.5), "Diesel": (16.3, 17.4)},

    # ── Toyota ─────────────────────────────────────────────────────────────
    "Fortuner": {"Petrol": (10.5, 12.0), "Diesel": (14.2, 16.2)},
    "Innova":   {"Petrol": (14.6, 16.0), "Diesel": (15.1, 17.0)},
    "Glanza":   {"Petrol": (21.5, 23.9), "CNG": (30.6, 32.0)},
    "Urban Cruiser": {"Petrol": (27.0, 28.4)},  # strong hybrid; listed as km/l
    "Camry":    {"Petrol": (19.0, 21.3)},  # hybrid

    # ── Volkswagen ─────────────────────────────────────────────────────────
    "Polo":     {"Petrol": (15.0, 16.5), "Diesel": (21.0, 22.5)},
    "Vento":    {"Petrol": (14.5, 16.0), "Diesel": (20.0, 21.8)},
    "Tiguan":   {"Petrol": (14.0, 15.1)},
    "Taigun":   {"Petrol": (15.7, 17.3)},
    "Virtus":   {"Petrol": (17.0, 19.9)},
}


def main():
    db = SessionLocal()
    try:
        updated = 0
        nulled = 0

        for model, fuel_map in MILEAGE_RANGES.items():
            cars = db.query(Car).filter(Car.model == model).all()
            if not cars:
                print(f"  [--] {model}: no rows found")
                continue

            for car in cars:
                rng = fuel_map.get(car.fuel_type)
                if rng is None:
                    # Electric or unknown — NULL
                    car.mileage = None
                    nulled += 1
                else:
                    lo, hi = rng
                    car.mileage = round(random.uniform(lo, hi), 1)
                    updated += 1

            db.commit()
            fuels = list(fuel_map.keys())
            print(f"  [OK] {model:<16} {' / '.join(fuels)}  ({len(cars)} rows)")

        print(f"\nDone. {updated} rows given real mileage; {nulled} set to NULL (Electric/no match).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
