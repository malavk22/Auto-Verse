"""
Fetches latest ARAI mileage figures from CarDekho and updates the database.

CarDekho embeds min_mileage / max_mileage in the page HTML for most models.
The range is split across fuel types:
  - Petrol → lower portion of range
  - Diesel → upper portion of range (diesel is more efficient)
  - CNG    → upper portion of range (CNG beats petrol)
  - Electric → NULL (range in km, not kmpl)

Models where scraping fails keep their existing DB values.

Run manually:
    python pipeline/refresh_mileage.py

Force refresh (ignore last-run cache):
    python pipeline/refresh_mileage.py --force

Schedule via cron (runs monthly — mileage changes rarely):
    0 3 1 * * cd /path/to/Auto-Verse/backend && venv/bin/python pipeline/refresh_mileage.py >> logs/mileage_refresh.log 2>&1
"""

from __future__ import annotations

import json
import logging
import os
import random
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

import requests

sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.car import Car

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

WORKERS         = 5
DELAY           = 0.5
MIN_REFRESH_HRS = 24 * 25   # mileage changes rarely — only re-fetch after 25 days
CACHE_FILE      = "pipeline/.last_mileage_refresh.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-IN,en;q=0.9",
}

# Model → CarDekho URL  (None = discontinued or EV — skip)
MODEL_URLS: dict[str, str | None] = {
    # Honda
    "Amaze":         "https://www.cardekho.com/honda/amaze",
    "City":          "https://www.cardekho.com/honda/city",
    "Civic":         None,
    "Jazz":          "https://www.cardekho.com/honda/jazz",
    "WR-V":          None,
    # Hyundai
    "Creta":         "https://www.cardekho.com/hyundai/creta",
    "Venue":         "https://www.cardekho.com/hyundai/venue",
    "Verna":         "https://www.cardekho.com/hyundai/verna",
    "i10":           "https://www.cardekho.com/hyundai/grand-i10-nios",
    "i20":           "https://www.cardekho.com/hyundai/i20",
    # Kia
    "Seltos":        "https://www.cardekho.com/kia/seltos",
    "Sonet":         "https://www.cardekho.com/kia/sonet",
    "Carens":        "https://www.cardekho.com/kia/carens",
    "Carnival":      "https://www.cardekho.com/kia/carnival",
    "EV6":           None,   # Electric — mileage stays NULL
    # Mahindra
    "Bolero":        "https://www.cardekho.com/mahindra/bolero",
    "Scorpio":       "https://www.cardekho.com/mahindra/scorpio-n",
    "Thar":          "https://www.cardekho.com/mahindra/thar",
    "XUV300":        "https://www.cardekho.com/mahindra/xuv-3xo",
    "XUV700":        "https://www.cardekho.com/mahindra/xuv700",
    # Maruti Suzuki
    "Swift":         "https://www.cardekho.com/maruti-suzuki/swift",
    "Baleno":        "https://www.cardekho.com/maruti-suzuki/baleno",
    "Dzire":         "https://www.cardekho.com/maruti-suzuki/dzire",
    "WagonR":        "https://www.cardekho.com/maruti-suzuki/wagon-r",
    "Ertiga":        "https://www.cardekho.com/maruti-suzuki/ertiga",
    # Renault
    "Kwid":          "https://www.cardekho.com/renault/kwid",
    "Triber":        "https://www.cardekho.com/renault/triber",
    "Kiger":         "https://www.cardekho.com/renault/kiger",
    "Duster":        "https://www.cardekho.com/renault/duster",
    "Lodgy":         None,
    # Skoda
    "Kushaq":        "https://www.cardekho.com/skoda/kushaq",
    "Slavia":        "https://www.cardekho.com/skoda/slavia",
    "Rapid":         None,
    "Octavia":       "https://www.cardekho.com/skoda/octavia",
    "Superb":        None,
    # Tata
    "Tiago":         "https://www.cardekho.com/tata/tiago",
    "Altroz":        "https://www.cardekho.com/tata/altroz",
    "Punch":         "https://www.cardekho.com/tata/punch",
    "Nexon":         "https://www.cardekho.com/tata/nexon",
    "Harrier":       "https://www.cardekho.com/tata/harrier",
    # Toyota
    "Fortuner":      "https://www.cardekho.com/toyota/fortuner",
    "Innova":        "https://www.cardekho.com/toyota/innova-hycross",
    "Glanza":        "https://www.cardekho.com/toyota/glanza",
    "Urban Cruiser": "https://www.cardekho.com/toyota/urban-cruiser-hyryder",
    "Camry":         "https://www.cardekho.com/toyota/camry",
    # Volkswagen
    "Tiguan":        "https://www.cardekho.com/volkswagen/tiguan",
    "Taigun":        "https://www.cardekho.com/volkswagen/taigun",
    "Virtus":        "https://www.cardekho.com/volkswagen/virtus",
    "Polo":          None,
    "Vento":         None,
}

_MIN_RE = re.compile(r'"min_mileage[_new]*"\s*:\s*([\d.]+)')
_MAX_RE = re.compile(r'"max_mileage[_new]*"\s*:\s*([\d.]+)')


def fetch_mileage_range(session: requests.Session, model: str, url: str) -> tuple[str, tuple[float, float] | None]:
    """Returns (model, (min_kmpl, max_kmpl)) or (model, None) on failure."""
    try:
        r = session.get(url, timeout=15)
        time.sleep(DELAY)
        if r.status_code != 200:
            return model, None

        mins = _MIN_RE.findall(r.text)
        maxs = _MAX_RE.findall(r.text)
        if not mins or not maxs:
            return model, None

        lo = float(mins[0])
        hi = float(maxs[0])
        if lo < 5 or hi > 50:   # sanity
            return model, None
        return model, (lo, hi)
    except requests.RequestException:
        return model, None


def mileage_for_fuel(fuel: str, lo: float, hi: float, fuel_types_in_model: set[str]) -> float | None:
    """
    Returns a randomised mileage value appropriate for the given fuel type,
    using the scraped lo–hi range as the full spread across all variants.

    Logic:
      - Single-fuel model: full range
      - Petrol in multi-fuel: lower 50% of range
      - Diesel in multi-fuel: upper 50% of range
      - CNG in multi-fuel: upper 50% of range (CNG beats petrol)
      - Electric: always NULL
    """
    if fuel == "Electric":
        return None

    span = hi - lo
    multi = len(fuel_types_in_model - {"Electric"}) > 1

    if not multi:
        return round(random.uniform(lo, hi), 1)

    if fuel == "Petrol":
        return round(random.uniform(lo, lo + span * 0.5), 1)
    elif fuel in ("Diesel", "CNG"):
        return round(random.uniform(hi - span * 0.5, hi), 1)

    return round(random.uniform(lo, hi), 1)


def last_run_hours_ago() -> float:
    if not os.path.exists(CACHE_FILE):
        return float("inf")
    try:
        with open(CACHE_FILE) as f:
            ts = json.load(f).get("last_run", "")
        last = datetime.fromisoformat(ts)
        return (datetime.now() - last).total_seconds() / 3600
    except Exception:
        return float("inf")


def save_last_run():
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, "w") as f:
        json.dump({"last_run": datetime.now().isoformat()}, f)


def main(force: bool = False):
    hrs = last_run_hours_ago()
    if not force and hrs < MIN_REFRESH_HRS:
        log.info(f"Last mileage refresh was {hrs:.0f}h ago (< {MIN_REFRESH_HRS}h). Use --force to override.")
        return

    log.info("=" * 60)
    log.info(f"Mileage refresh started — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    log.info("=" * 60)

    t0 = time.time()
    active = {m: u for m, u in MODEL_URLS.items() if u is not None}

    # ── Parallel fetch ─────────────────────────────────────────────────────────
    results: dict[str, tuple[float, float] | None] = {}

    with requests.Session() as session:
        session.headers.update(HEADERS)
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            futures = {pool.submit(fetch_mileage_range, session, m, u): m for m, u in active.items()}
            for future in as_completed(futures):
                model, rng = future.result()
                results[model] = rng
                if rng:
                    log.info(f"  OK    {model:<16} {rng[0]}–{rng[1]} kmpl")
                else:
                    log.warning(f"  FAIL  {model:<16} keeping existing values")

    # ── DB update (single transaction) ────────────────────────────────────────
    db = SessionLocal()
    try:
        from sqlalchemy import func

        updated_models = failed = skipped = 0

        # Null out all Electric cars first
        electric_cars = db.query(Car).filter(Car.fuel_type == "Electric").all()
        for c in electric_cars:
            c.mileage = None

        for model, rng in results.items():
            if rng is None:
                failed += 1
                continue

            lo, hi = rng
            cars = db.query(Car).filter(Car.model == model).all()
            if not cars:
                skipped += 1
                continue

            fuel_types = {c.fuel_type for c in cars if c.fuel_type}

            for car in cars:
                car.mileage = mileage_for_fuel(car.fuel_type, lo, hi, fuel_types)

            updated_models += 1

        # Discontinued / EV models not in results — leave their mileage unchanged
        db.commit()

        elapsed = time.time() - t0
        log.info("-" * 60)
        log.info(
            f"Done in {elapsed:.1f}s.  "
            f"Updated: {updated_models} models  |  "
            f"Failed (kept existing): {failed}  |  "
            f"Electric nulled: {len(electric_cars)}"
        )
        log.info("=" * 60)
        save_last_run()

    finally:
        db.close()


if __name__ == "__main__":
    force = "--force" in sys.argv
    main(force=force)
