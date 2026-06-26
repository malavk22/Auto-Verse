"""
Sets realistic ex-showroom price ranges per model using verified CarDekho data (June 2026).

Price ranges span base variant → top variant so the dataset reflects real market spread.
For discontinued models, last recorded ex-showroom prices are used.
Prices are randomized within the real range per row to keep the dataset varied.

Run from the backend/ directory:
    python pipeline/fix_prices.py
"""

from __future__ import annotations

import random
import sys

sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.car import Car, Brand

# (min_price, max_price) in ₹ — verified from CarDekho June 2026
# Discontinued models use last recorded ex-showroom prices
PRICE_RANGES: dict[str, tuple[int, int]] = {
    # ── Honda ──────────────────────────────────────────────────
    "Amaze":         (751_000,  1_100_000),   # ₹7.51L – ₹11L
    "City":          (1_200_000, 2_100_000),  # ₹12L – ₹21L
    "Civic":         (1_794_000, 2_000_000),  # discontinued — last price
    "Jazz":          (801_000,  1_032_000),   # discontinued — last price
    "WR-V":          (850_000,  1_200_000),   # discontinued — last price

    # ── Hyundai ────────────────────────────────────────────────
    "i10":           (560_000,  850_000),     # ₹5.60L – ₹8.5L
    "i20":           (600_000,  1_200_000),   # ₹6L – ₹12L
    "Venue":         (800_000,  1_400_000),   # ₹8L – ₹14L
    "Verna":         (1_099_000, 1_700_000),  # ₹10.99L – ₹17L
    "Creta":         (1_091_000, 2_000_000),  # ₹10.91L – ₹20L

    # ── Kia ────────────────────────────────────────────────────
    "Sonet":         (733_000,  1_550_000),   # ₹7.33L – ₹15.5L
    "Seltos":        (1_100_000, 2_000_000),  # ₹11L – ₹20L
    "Carens":        (1_102_000, 1_900_000),  # ₹11.02L – ₹19L
    "EV6":           (6_597_000, 6_597_000),  # ₹65.97L (single price point)
    "Carnival":      (5_945_000, 6_000_000),  # ₹59.45L – ₹60L

    # ── Mahindra ───────────────────────────────────────────────
    "Bolero":        (800_000,  1_150_000),   # ₹8L – ₹11.5L
    "Scorpio":       (1_349_000, 2_434_000),  # ₹13.49L – ₹24.34L
    "Thar":          (999_000,  1_762_000),   # ₹9.99L – ₹17.62L
    "XUV300":        (754_000,  1_600_000),   # ₹7.54L – ₹16L (XUV 3XO)
    "XUV700":        (1_399_000, 2_714_000),  # ₹13.99L – ₹27.14L

    # ── Maruti Suzuki ──────────────────────────────────────────
    "WagonR":        (499_000,  750_000),     # ₹4.99L – ₹7.5L
    "Swift":         (579_000,  880_000),     # ₹5.79L – ₹8.8L
    "Baleno":        (599_000,  1_000_000),   # ₹5.99L – ₹10L
    "Dzire":         (626_000,  970_000),     # ₹6.26L – ₹9.7L
    "Ertiga":        (880_000,  1_350_000),   # ₹8.8L – ₹13.5L

    # ── Renault ────────────────────────────────────────────────
    "Kwid":          (430_000,  599_000),     # ₹4.30L – ₹5.99L
    "Triber":        (581_000,  900_000),     # ₹5.81L – ₹9L
    "Kiger":         (581_000,  1_034_000),   # ₹5.81L – ₹10.34L
    "Duster":        (1_049_000, 1_869_000),  # ₹10.49L – ₹18.69L
    "Lodgy":         (863_000,  1_211_000),   # discontinued — last price

    # ── Skoda ──────────────────────────────────────────────────
    "Kushaq":        (1_069_000, 2_000_000),  # ₹10.69L – ₹20L
    "Slavia":        (1_000_000, 1_819_000),  # ₹10L – ₹18.19L
    "Octavia":       (2_400_000, 2_800_000),  # discontinued — last price
    "Rapid":         (1_050_000, 1_650_000),  # discontinued — last price
    "Superb":        (3_500_000, 4_100_000),  # discontinued — last price

    # ── Tata Motors ────────────────────────────────────────────
    "Tiago":         (470_000,  900_000),     # ₹4.70L – ₹9L
    "Altroz":        (630_000,  1_051_000),   # ₹6.30L – ₹10.51L
    "Punch":         (565_000,  1_000_000),   # ₹5.65L – ₹10L
    "Nexon":         (737_000,  1_550_000),   # ₹7.37L – ₹15.5L
    "Harrier":       (1_289_000, 2_589_000),  # ₹12.89L – ₹25.89L

    # ── Toyota ─────────────────────────────────────────────────
    "Glanza":        (646_000,  1_000_000),   # ₹6.46L – ₹10L
    "Urban Cruiser": (1_099_000, 1_900_000),  # ₹10.99L – ₹19L
    "Innova":        (1_899_000, 2_553_000),  # ₹18.99L – ₹25.53L (Crysta)
    "Fortuner":      (3_476_000, 4_959_000),  # ₹34.76L – ₹49.59L
    "Camry":         (4_748_000, 5_000_000),  # ₹47.48L – ₹50L

    # ── Volkswagen ─────────────────────────────────────────────
    "Virtus":        (1_050_000, 2_000_000),  # ₹10.50L – ₹20L
    "Taigun":        (1_100_000, 2_000_000),  # ₹11L – ₹20L
    "Tiguan":        (4_711_000, 4_711_000),  # ₹47.11L (R-Line, single variant)
    "Polo":          (900_000,  1_200_000),   # discontinued — last price
    "Vento":         (1_100_000, 1_400_000),  # discontinued — last price
}


def main():
    db = SessionLocal()
    try:
        updated = 0
        skipped = 0

        for model, (lo, hi) in PRICE_RANGES.items():
            cars = db.query(Car).filter(Car.model == model).all()
            if not cars:
                print(f"  [--] {model}: no rows found")
                skipped += 1
                continue

            for car in cars:
                # Randomise within real range; round to nearest ₹1,000
                new_price = round(random.uniform(lo, hi) / 1000) * 1000
                car.price = new_price
                updated += 1

            db.commit()
            lo_l = lo / 100_000
            hi_l = hi / 100_000
            print(f"  [OK] {model:<16} ₹{lo_l:.2f}L – ₹{hi_l:.2f}L  ({len(cars)} rows)")

        print(f"\nDone. {updated} rows updated with real ex-showroom price ranges.")
        if skipped:
            print(f"      {skipped} model(s) not found in DB — check model names.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
