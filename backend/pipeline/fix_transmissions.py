"""
Corrects transmission assignments using real India market availability per model.

Each model is mapped to the gearbox variants it actually sold in India,
with weighted random distribution reflecting real-world sales mix.

Run from the backend/ directory:
    python pipeline/fix_transmissions.py
"""

from __future__ import annotations

import random
import sys

sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.car import Car

# (options, weights) — weights must sum to 100
# EVs and strong hybrids: Automatic only (no manual gearbox)
# AT-heavy SUVs: weighted toward Automatic
# Entry hatchbacks: manual majority
TRANSMISSION_OPTIONS: dict[str, tuple[list[str], list[int]]] = {

    # ── Honda ──────────────────────────────────────────────────────────────
    "Amaze":         (["Manual", "Automatic"], [60, 40]),
    "City":          (["Manual", "Automatic"], [55, 45]),
    "Civic":         (["Manual", "Automatic"], [50, 50]),
    "Jazz":          (["Manual", "Automatic"], [60, 40]),
    "WR-V":          (["Manual", "Automatic"], [70, 30]),

    # ── Hyundai ────────────────────────────────────────────────────────────
    "i10":           (["Manual", "Automatic"], [70, 30]),
    "i20":           (["Manual", "Automatic"], [65, 35]),
    "Venue":         (["Manual", "Automatic"], [55, 45]),
    "Verna":         (["Manual", "Automatic"], [50, 50]),
    "Creta":         (["Manual", "Automatic"], [50, 50]),

    # ── Kia ────────────────────────────────────────────────────────────────
    "Seltos":        (["Manual", "Automatic"], [45, 55]),
    "Sonet":         (["Manual", "Automatic"], [55, 45]),
    "Carens":        (["Manual", "Automatic"], [50, 50]),
    "Carnival":      (["Automatic"],           [100]),   # 8AT only
    "EV6":           (["Automatic"],           [100]),   # EV — single-speed

    # ── Mahindra ───────────────────────────────────────────────────────────
    "Bolero":        (["Manual"],              [100]),   # manual only
    "Scorpio":       (["Manual", "Automatic"], [60, 40]),
    "Thar":          (["Manual", "Automatic"], [55, 45]),
    "XUV300":        (["Manual", "Automatic"], [60, 40]),
    "XUV700":        (["Manual", "Automatic"], [40, 60]),

    # ── Maruti Suzuki ──────────────────────────────────────────────────────
    # Budget Maruti hatchbacks skew manual; AMT variants exist
    "Swift":         (["Manual", "Automatic"], [65, 35]),
    "Baleno":        (["Manual", "Automatic"], [60, 40]),
    "Dzire":         (["Manual", "Automatic"], [65, 35]),
    "WagonR":        (["Manual", "Automatic"], [60, 40]),
    "Ertiga":        (["Manual", "Automatic"], [60, 40]),

    # ── Renault ────────────────────────────────────────────────────────────
    "Kwid":          (["Manual", "Automatic"], [75, 25]),
    "Triber":        (["Manual", "Automatic"], [70, 30]),
    "Kiger":         (["Manual", "Automatic"], [60, 40]),
    "Duster":        (["Manual", "Automatic"], [55, 45]),
    "Lodgy":         (["Manual"],              [100]),   # Lodgy India manual only

    # ── Skoda ──────────────────────────────────────────────────────────────
    # MQB-A0 platform (Kushaq/Slavia): both MT and AT available
    "Rapid":         (["Manual", "Automatic"], [55, 45]),
    "Octavia":       (["Automatic"],           [100]),   # DSG only in India
    "Superb":        (["Automatic"],           [100]),   # DSG only
    "Kushaq":        (["Manual", "Automatic"], [55, 45]),
    "Slavia":        (["Manual", "Automatic"], [55, 45]),

    # ── Tata Motors ────────────────────────────────────────────────────────
    "Tiago":         (["Manual", "Automatic"], [70, 30]),
    "Altroz":        (["Manual", "Automatic"], [75, 25]),
    "Punch":         (["Manual", "Automatic"], [65, 35]),
    # Nexon electric is automatic; petrol/diesel have both
    "Nexon":         (["Manual", "Automatic"], [55, 45]),
    "Harrier":       (["Manual", "Automatic"], [45, 55]),

    # ── Toyota ─────────────────────────────────────────────────────────────
    # Fortuner: both MT and AT (AT dominates in India)
    "Fortuner":      (["Manual", "Automatic"], [30, 70]),
    # Innova Crysta: both; HyCross is CVT automatic
    "Innova":        (["Manual", "Automatic"], [40, 60]),
    "Glanza":        (["Manual", "Automatic"], [65, 35]),
    "Urban Cruiser": (["Manual", "Automatic"], [50, 50]),
    "Camry":         (["Automatic"],           [100]),   # CVT/hybrid auto only

    # ── Volkswagen ─────────────────────────────────────────────────────────
    "Polo":          (["Manual", "Automatic"], [60, 40]),
    "Vento":         (["Manual", "Automatic"], [55, 45]),
    "Tiguan":        (["Automatic"],           [100]),   # DSG only in India
    "Taigun":        (["Manual", "Automatic"], [50, 50]),
    "Virtus":        (["Manual", "Automatic"], [50, 50]),
}


def main():
    db = SessionLocal()
    try:
        updated = 0
        for model, (options, weights) in TRANSMISSION_OPTIONS.items():
            cars = db.query(Car).filter(Car.model == model).all()
            if not cars:
                print(f"  [--] {model}: no rows found")
                continue

            for car in cars:
                car.transmission = random.choices(options, weights=weights, k=1)[0]
                updated += 1

            db.commit()
            dist = " / ".join(options)
            print(f"  [OK] {model:<16} {dist}  ({len(cars)} rows)")

        print(f"\nDone. {updated} rows updated with real transmission options.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
