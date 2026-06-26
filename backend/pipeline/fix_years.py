"""
Corrects synthetic year ranges with real India launch and discontinuation years.

Active models get years from launch year → 2024.
Discontinued models get years from launch year → last year sold in India.

Run from the backend/ directory:
    python pipeline/fix_years.py
"""

from __future__ import annotations

import random
import sys

sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.car import Car, Brand

# (launch_year, last_year) in India
# Active models: last_year = 2024
# Discontinued models: last_year = year last sold
YEAR_RANGES: dict[str, tuple[int, int]] = {
    # ── Honda ──────────────────────────────────────────────────
    "Amaze":         (2016, 2024),  # 1st gen 2013, 2nd gen 2016, 3rd gen 2024
    "City":          (2014, 2024),  # 4th gen 2014, 5th gen 2020 — long history
    "Civic":         (2019, 2021),  # 10th gen India only 2019–2021, discontinued
    "Jazz":          (2015, 2020),  # India 2015–2020, discontinued
    "WR-V":          (2017, 2023),  # India 2017–2023, discontinued

    # ── Hyundai ────────────────────────────────────────────────
    "Creta":         (2015, 2024),  # 1st gen 2015
    "Venue":         (2019, 2024),  # launched 2019
    "Verna":         (2015, 2024),  # multiple gens, active
    "i10":           (2014, 2024),  # Grand i10 2013, Nios 2019, active
    "i20":           (2014, 2024),  # 2nd gen 2014, 3rd gen 2020, active

    # ── Kia ────────────────────────────────────────────────────
    "Seltos":        (2019, 2024),  # Kia entered India 2019
    "Sonet":         (2020, 2024),  # launched 2020
    "Carens":        (2022, 2024),  # launched 2022
    "Carnival":      (2020, 2024),  # launched India 2020
    "EV6":           (2022, 2024),  # launched India 2022

    # ── Mahindra ───────────────────────────────────────────────
    "Bolero":        (2014, 2024),  # long-running model
    "Scorpio":       (2014, 2024),  # Scorpio Classic + Scorpio-N 2022
    "Thar":          (2020, 2024),  # current gen launched 2020
    "XUV300":        (2019, 2024),  # launched 2019, became XUV 3XO 2024
    "XUV700":        (2021, 2024),  # launched 2021

    # ── Maruti Suzuki ──────────────────────────────────────────
    "Swift":         (2014, 2024),  # 2nd gen 2011, 3rd gen 2018, 4th gen 2024
    "Baleno":        (2015, 2024),  # launched 2015
    "Dzire":         (2014, 2024),  # long history
    "WagonR":        (2014, 2024),  # long history, current gen 2019
    "Ertiga":        (2014, 2024),  # 1st gen 2012, 2nd gen 2018

    # ── Renault ────────────────────────────────────────────────
    "Kwid":          (2015, 2024),  # launched 2015
    "Triber":        (2019, 2024),  # launched 2019
    "Kiger":         (2021, 2024),  # launched 2021
    "Duster":        (2014, 2024),  # 1st gen 2012, discontinued 2022, relaunched 2024
    "Lodgy":         (2015, 2019),  # launched 2015, discontinued 2019

    # ── Skoda ──────────────────────────────────────────────────
    "Rapid":         (2015, 2022),  # India 2012–2022, discontinued
    "Octavia":       (2015, 2023),  # multiple gens, last sold 2023 in India
    "Superb":        (2016, 2022),  # 3rd gen 2016, discontinued 2022
    "Kushaq":        (2021, 2024),  # launched 2021
    "Slavia":        (2022, 2024),  # launched 2022

    # ── Tata Motors ────────────────────────────────────────────
    "Tiago":         (2016, 2024),  # launched 2016
    "Nexon":         (2017, 2024),  # launched 2017
    "Harrier":       (2019, 2024),  # launched 2019
    "Altroz":        (2020, 2024),  # launched 2020
    "Punch":         (2021, 2024),  # launched 2021

    # ── Toyota ─────────────────────────────────────────────────
    "Fortuner":      (2016, 2024),  # 2nd gen launched India 2016
    "Innova":        (2016, 2024),  # Innova Crysta 2016
    "Glanza":        (2019, 2024),  # launched 2019
    "Urban Cruiser": (2020, 2024),  # Urban Cruiser 2020, Hyryder 2022
    "Camry":         (2019, 2024),  # hybrid-only gen launched 2019

    # ── Volkswagen ─────────────────────────────────────────────
    "Polo":          (2015, 2022),  # discontinued India 2022
    "Vento":         (2015, 2022),  # discontinued India 2022
    "Tiguan":        (2017, 2024),  # AllSpace 2021, active
    "Taigun":        (2021, 2024),  # launched 2021
    "Virtus":        (2022, 2024),  # launched 2022
}


def main():
    db = SessionLocal()
    try:
        updated = 0
        for model, (launch, last) in YEAR_RANGES.items():
            cars = db.query(Car).filter(Car.model == model).all()
            if not cars:
                print(f"  [--] {model}: no rows found")
                continue

            years = list(range(launch, last + 1))
            for car in cars:
                car.year = random.choice(years)
                updated += 1

            db.commit()
            status = "active" if last == 2024 else f"discontinued {last}"
            print(f"  [OK] {model:<16} {launch}–{last}  ({status})  {len(cars)} rows")

        print(f"\nDone. {updated} rows updated with real year ranges.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
