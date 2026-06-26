"""
Corrects fuel type assignments using real India market availability per model.

Each model is mapped to the fuel variants it actually sold in India,
with weighted random distribution that reflects real-world sales mix.

Run from the backend/ directory:
    python pipeline/fix_fuel_types.py
"""

from __future__ import annotations

import random
import sys

sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.car import Car

# (options, weights) — weights must sum to 100
# Weights reflect approximate real-world India sales mix per model
FUEL_OPTIONS: dict[str, tuple[list[str], list[int]]] = {

    # ── Honda ──────────────────────────────────────────────────────────────
    # Amaze 2016-2023 had both; 3rd gen 2024 petrol-only → include diesel
    "Amaze":         (["Petrol", "Diesel"],         [65, 35]),
    # City 4th gen (pre-2020) had diesel; 5th gen 2020 dropped it
    "City":          (["Petrol", "Diesel"],         [70, 30]),
    # Civic 10th gen India 2019-2021 sold petrol and diesel variants
    "Civic":         (["Petrol", "Diesel"],         [55, 45]),
    # Jazz India only ever sold petrol
    "Jazz":          (["Petrol"],                   [100]),
    # WR-V sold both in India throughout 2017-2023
    "WR-V":          (["Petrol", "Diesel"],         [55, 45]),

    # ── Hyundai ────────────────────────────────────────────────────────────
    # i10 / Grand i10: petrol + CNG; old gen had diesel (dropped ~2017)
    "i10":           (["Petrol", "Diesel", "CNG"],  [55, 20, 25]),
    # i20: petrol + diesel (diesel dropped in 4th gen 2020)
    "i20":           (["Petrol", "Diesel"],         [70, 30]),
    # Venue: all 3 — petrol, diesel, CNG (S CNG launched 2021)
    "Venue":         (["Petrol", "Diesel", "CNG"],  [50, 30, 20]),
    # Verna: petrol and diesel both active
    "Verna":         (["Petrol", "Diesel"],         [65, 35]),
    # Creta: petrol and diesel (diesel remains popular in this segment)
    "Creta":         (["Petrol", "Diesel"],         [60, 40]),

    # ── Kia ────────────────────────────────────────────────────────────────
    "Seltos":        (["Petrol", "Diesel"],         [60, 40]),
    "Sonet":         (["Petrol", "Diesel", "CNG"],  [50, 30, 20]),
    "Carens":        (["Petrol", "Diesel"],         [55, 45]),
    "Carnival":      (["Diesel"],                   [100]),  # India only diesel
    "EV6":           (["Electric"],                 [100]),

    # ── Mahindra ───────────────────────────────────────────────────────────
    "Bolero":        (["Diesel"],                   [100]),  # always diesel-only
    # Scorpio Classic is diesel-only; Scorpio-N (2022+) added petrol
    "Scorpio":       (["Petrol", "Diesel"],         [30, 70]),
    "Thar":          (["Petrol", "Diesel"],         [45, 55]),
    "XUV300":        (["Petrol", "Diesel"],         [55, 45]),
    "XUV700":        (["Petrol", "Diesel"],         [50, 50]),

    # ── Maruti Suzuki ──────────────────────────────────────────────────────
    # Swift dropped diesel in 2020; CNG launched 2022; petrol majority
    "Swift":         (["Petrol", "CNG"],            [80, 20]),
    "Baleno":        (["Petrol", "CNG"],            [80, 20]),
    "Dzire":         (["Petrol", "CNG"],            [75, 25]),
    "WagonR":        (["Petrol", "CNG"],            [70, 30]),
    # Ertiga dropped diesel in 2018; CNG available since 2019
    "Ertiga":        (["Petrol", "CNG"],            [75, 25]),

    # ── Renault ────────────────────────────────────────────────────────────
    "Kwid":          (["Petrol"],                   [100]),
    "Triber":        (["Petrol"],                   [100]),
    "Kiger":         (["Petrol"],                   [100]),
    # Old Duster had diesel heavily; new 2024 relaunch is petrol-only
    "Duster":        (["Petrol", "Diesel"],         [45, 55]),
    # Lodgy India 2015-2019: petrol and diesel
    "Lodgy":         (["Petrol", "Diesel"],         [35, 65]),

    # ── Skoda ──────────────────────────────────────────────────────────────
    # Rapid had both; Kushaq/Slavia are TSI petrol-only
    "Rapid":         (["Petrol", "Diesel"],         [55, 45]),
    "Octavia":       (["Petrol"],                   [100]),  # latest gen petrol-only
    "Superb":        (["Petrol"],                   [100]),
    "Kushaq":        (["Petrol"],                   [100]),
    "Slavia":        (["Petrol"],                   [100]),

    # ── Tata Motors ────────────────────────────────────────────────────────
    # Tiago: petrol + CNG (Tiago EV is marketed separately)
    "Tiago":         (["Petrol", "CNG"],            [75, 25]),
    # Altroz: petrol + CNG; diesel variant was sold briefly 2020-2022
    "Altroz":        (["Petrol", "Diesel", "CNG"],  [60, 15, 25]),
    # Punch: petrol + CNG (Punch EV is separate)
    "Punch":         (["Petrol", "CNG"],            [75, 25]),
    # Nexon: petrol, diesel, and Nexon EV (all sold under Nexon name)
    "Nexon":         (["Petrol", "Diesel", "Electric"], [50, 35, 15]),
    # Harrier: diesel-only until 2024 facelift added petrol
    "Harrier":       (["Petrol", "Diesel"],         [20, 80]),

    # ── Toyota ─────────────────────────────────────────────────────────────
    # Fortuner: diesel dominates India; petrol available but minority
    "Fortuner":      (["Petrol", "Diesel"],         [20, 80]),
    # Innova Crysta: petrol + diesel (HyCross 2023 is petrol-hybrid)
    "Innova":        (["Petrol", "Diesel"],         [35, 65]),
    "Glanza":        (["Petrol", "CNG"],            [80, 20]),
    "Urban Cruiser": (["Petrol"],                   [100]),  # strong hybrid petrol
    "Camry":         (["Petrol"],                   [100]),  # hybrid petrol only

    # ── Volkswagen ─────────────────────────────────────────────────────────
    # Polo/Vento (pre-2022): petrol + diesel both sold
    "Polo":          (["Petrol", "Diesel"],         [65, 35]),
    "Vento":         (["Petrol", "Diesel"],         [60, 40]),
    "Tiguan":        (["Petrol"],                   [100]),  # TSI only
    "Taigun":        (["Petrol"],                   [100]),  # TSI only
    "Virtus":        (["Petrol"],                   [100]),  # TSI only
}


def main():
    db = SessionLocal()
    try:
        updated = 0
        for model, (options, weights) in FUEL_OPTIONS.items():
            cars = db.query(Car).filter(Car.model == model).all()
            if not cars:
                print(f"  [--] {model}: no rows found")
                continue

            for car in cars:
                car.fuel_type = random.choices(options, weights=weights, k=1)[0]
                updated += 1

            db.commit()
            dist = " / ".join(f"{o}" for o in options)
            print(f"  [OK] {model:<16} {dist}  ({len(cars)} rows)")

        print(f"\nDone. {updated} rows updated with real fuel type options.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
