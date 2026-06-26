"""
Sets realistic engine displacement (CC) per model × fuel_type combination.

- Petrol/Diesel/CNG: real engine sizes used in that model in India
- Electric: NULL (motor, not combustion engine)

Run from the backend/ directory:
    python pipeline/fix_engine_cc.py
"""

from __future__ import annotations

import random
import sys

sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.car import Car

# Maps model → fuel_type → list of real CC values used in India variants
# Using list so we can randomly pick a real engine option (e.g. 1.0T vs 1.5T)
ENGINE_CC: dict[str, dict[str, list[int]]] = {

    # ── Honda ──────────────────────────────────────────────────────────────
    "Amaze":    {"Petrol": [1199],       "Diesel": [1498]},
    "City":     {"Petrol": [1497],       "Diesel": [1498]},
    "Civic":    {"Petrol": [1799],       "Diesel": [1597]},
    "Jazz":     {"Petrol": [1199]},
    "WR-V":     {"Petrol": [1199],       "Diesel": [1498]},

    # ── Hyundai ────────────────────────────────────────────────────────────
    "i10":      {"Petrol": [1197],       "Diesel": [1120], "CNG": [1197]},
    "i20":      {"Petrol": [998, 1197],  "Diesel": [1493]},
    "Venue":    {"Petrol": [998, 1197],  "Diesel": [1493], "CNG": [1197]},
    "Verna":    {"Petrol": [1497, 1591], "Diesel": [1493]},
    "Creta":    {"Petrol": [1497, 998],  "Diesel": [1493]},

    # ── Kia ────────────────────────────────────────────────────────────────
    "Seltos":   {"Petrol": [1497, 998],  "Diesel": [1493]},
    "Sonet":    {"Petrol": [998, 1197],  "Diesel": [1493], "CNG": [1197]},
    "Carens":   {"Petrol": [1497, 1591], "Diesel": [1493]},
    "Carnival": {"Diesel": [2199]},
    "EV6":      {"Electric": None},

    # ── Mahindra ───────────────────────────────────────────────────────────
    "Bolero":   {"Diesel": [1493]},
    "Scorpio":  {"Petrol": [1997],       "Diesel": [2179, 2498]},
    "Thar":     {"Petrol": [1997],       "Diesel": [2179]},
    "XUV300":   {"Petrol": [1197],       "Diesel": [1497]},
    "XUV700":   {"Petrol": [1997],       "Diesel": [2184]},

    # ── Maruti Suzuki ──────────────────────────────────────────────────────
    "Swift":    {"Petrol": [1197],       "CNG": [1197]},
    "Baleno":   {"Petrol": [1197],       "CNG": [1197]},
    "Dzire":    {"Petrol": [1197],       "CNG": [1197]},
    "WagonR":   {"Petrol": [998, 1197],  "CNG": [998, 1197]},
    "Ertiga":   {"Petrol": [1462],       "CNG": [1462]},

    # ── Renault ────────────────────────────────────────────────────────────
    "Kwid":     {"Petrol": [999]},
    "Triber":   {"Petrol": [999]},
    "Kiger":    {"Petrol": [999]},
    "Duster":   {"Petrol": [1498],       "Diesel": [1461]},
    "Lodgy":    {"Petrol": [1598],       "Diesel": [1461]},

    # ── Skoda ──────────────────────────────────────────────────────────────
    "Rapid":    {"Petrol": [999, 1197],  "Diesel": [1498]},
    "Octavia":  {"Petrol": [1395]},
    "Superb":   {"Petrol": [1798]},
    "Kushaq":   {"Petrol": [999, 1498]},
    "Slavia":   {"Petrol": [999, 1498]},

    # ── Tata Motors ────────────────────────────────────────────────────────
    "Tiago":    {"Petrol": [1199],       "CNG": [1199]},
    "Altroz":   {"Petrol": [1199],       "Diesel": [1497], "CNG": [1199]},
    "Punch":    {"Petrol": [1199],       "CNG": [1199]},
    "Nexon":    {"Petrol": [1199],       "Diesel": [1497], "Electric": None},
    "Harrier":  {"Petrol": [1956],       "Diesel": [1956]},

    # ── Toyota ─────────────────────────────────────────────────────────────
    "Fortuner": {"Petrol": [2694],       "Diesel": [2755]},
    "Innova":   {"Petrol": [2694],       "Diesel": [2393]},
    "Glanza":   {"Petrol": [1197],       "CNG": [1197]},
    "Urban Cruiser": {"Petrol": [1490]},  # Hyryder 1.5 strong hybrid
    "Camry":    {"Petrol": [2487]},       # 2.5 hybrid

    # ── Volkswagen ─────────────────────────────────────────────────────────
    "Polo":     {"Petrol": [999, 1197],  "Diesel": [1498]},
    "Vento":    {"Petrol": [999, 1598],  "Diesel": [1498]},
    "Tiguan":   {"Petrol": [1984]},
    "Taigun":   {"Petrol": [999, 1498]},
    "Virtus":   {"Petrol": [999, 1498]},
}


def main():
    db = SessionLocal()
    try:
        updated = 0
        nulled = 0

        for model, fuel_map in ENGINE_CC.items():
            cars = db.query(Car).filter(Car.model == model).all()
            if not cars:
                print(f"  [--] {model}: no rows found")
                continue

            for car in cars:
                options = fuel_map.get(car.fuel_type)
                if options is None:
                    car.engine_cc = None
                    nulled += 1
                else:
                    car.engine_cc = random.choice(options)
                    updated += 1

            db.commit()
            fuels = list(fuel_map.keys())
            print(f"  [OK] {model:<16} {' / '.join(fuels)}  ({len(cars)} rows)")

        # Catch-all: any remaining Electric rows not covered above
        remaining_ev = db.query(Car).filter(Car.fuel_type == "Electric", Car.engine_cc != None).all()
        if remaining_ev:
            for c in remaining_ev:
                c.engine_cc = None
                nulled += 1
            db.commit()
            print(f"  [FIX] {len(remaining_ev)} remaining Electric rows → engine_cc = NULL")

        print(f"\nDone. {updated} rows given real engine CC; {nulled} set to NULL (Electric).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
