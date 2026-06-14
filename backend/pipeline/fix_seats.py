"""
Corrects synthetic seat counts in the DB with real-world accurate values.
For models that genuinely offer multiple seating configurations, picks
randomly from the valid options so the data stays varied but realistic.

Run from the backend/ directory:
    python pipeline/fix_seats.py
"""

from __future__ import annotations

import random
import sys

sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.car import Car, Brand

# Real seating capacities for each model sold in India.
# Multiple values = model genuinely offers those configurations.
REAL_SEATS: dict[str, list[int]] = {
    "Amaze":        [5],
    "City":         [5],
    "Civic":        [5],
    "Jazz":         [5],
    "WR-V":         [5],
    "Creta":        [5],
    "Venue":        [5],
    "Verna":        [5],
    "i10":          [5],
    "i20":          [5],
    "Carens":       [6, 7],
    "Carnival":     [7, 8],
    "EV6":          [5],
    "Seltos":       [5],
    "Sonet":        [5],
    "Bolero":       [7],
    "Scorpio":      [6, 7],
    "Thar":         [4],
    "XUV300":       [5],
    "XUV700":       [5, 7],
    "Baleno":       [5],
    "Dzire":        [5],
    "Ertiga":       [7],
    "Swift":        [5],
    "WagonR":       [5],
    "Duster":       [5],
    "Kiger":        [5],
    "Kwid":         [5],
    "Lodgy":        [7],
    "Triber":       [7],
    "Kushaq":       [5],
    "Octavia":      [5],
    "Rapid":        [5],
    "Slavia":       [5],
    "Superb":       [5],
    "Altroz":       [5],
    "Harrier":      [5],
    "Nexon":        [5],
    "Punch":        [5],
    "Tiago":        [5],
    "Camry":        [5],
    "Fortuner":     [7],
    "Glanza":       [5],
    "Innova":       [7, 8],
    "Urban Cruiser":[5],
    "Polo":         [5],
    "Taigun":       [5],
    "Tiguan":       [5, 7],
    "Vento":        [5],
    "Virtus":       [5],
}


def main():
    db = SessionLocal()
    try:
        updated = 0
        for model, valid_seats in REAL_SEATS.items():
            cars = db.query(Car).filter(Car.model == model).all()
            for car in cars:
                new_seats = random.choice(valid_seats)
                if car.seats != new_seats:
                    car.seats = new_seats
                    updated += 1
            db.commit()
            seats_str = "/".join(str(s) for s in valid_seats)
            print(f"  {model}: → {seats_str} seats  ({len(cars)} rows)")

        print(f"\nDone. {updated} rows updated with realistic seat counts.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
