"""
Fetches current transmission options from CarDekho and corrects the database.

For each car row whose transmission is no longer offered for that model,
reassigns it to a valid option. Electric/Automatic-only models are protected.

Run manually:
    python pipeline/refresh_transmissions.py

Force refresh:
    python pipeline/refresh_transmissions.py --force

Schedule via cron (monthly):
    0 5 1 * * cd /path/to/Auto-Verse/backend && venv/bin/python pipeline/refresh_transmissions.py >> logs/trans_refresh.log 2>&1
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
MIN_REFRESH_HRS = 24 * 25
CACHE_FILE      = "pipeline/.last_transmission_refresh.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-IN,en;q=0.9",
}

MODEL_URLS: dict[str, str | None] = {
    "Amaze":         "https://www.cardekho.com/honda/amaze",
    "City":          "https://www.cardekho.com/honda/city",
    "Civic":         None,
    "Jazz":          "https://www.cardekho.com/honda/jazz",
    "WR-V":          None,
    "Creta":         "https://www.cardekho.com/hyundai/creta",
    "Venue":         "https://www.cardekho.com/hyundai/venue",
    "Verna":         "https://www.cardekho.com/hyundai/verna",
    "i10":           "https://www.cardekho.com/hyundai/grand-i10-nios",
    "i20":           "https://www.cardekho.com/hyundai/i20",
    "Seltos":        "https://www.cardekho.com/kia/seltos",
    "Sonet":         "https://www.cardekho.com/kia/sonet",
    "Carens":        "https://www.cardekho.com/kia/carens",
    "Carnival":      "https://www.cardekho.com/kia/carnival",
    "EV6":           None,   # Electric — always Automatic, never change
    "Bolero":        "https://www.cardekho.com/mahindra/bolero",
    "Scorpio":       "https://www.cardekho.com/mahindra/scorpio-n",
    "Thar":          "https://www.cardekho.com/mahindra/thar",
    "XUV300":        "https://www.cardekho.com/mahindra/xuv-3xo",
    "XUV700":        "https://www.cardekho.com/mahindra/xuv700",
    "Swift":         "https://www.cardekho.com/maruti-suzuki/swift",
    "Baleno":        "https://www.cardekho.com/maruti-suzuki/baleno",
    "Dzire":         "https://www.cardekho.com/maruti-suzuki/dzire",
    "WagonR":        "https://www.cardekho.com/maruti-suzuki/wagon-r",
    "Ertiga":        "https://www.cardekho.com/maruti-suzuki/ertiga",
    "Kwid":          "https://www.cardekho.com/renault/kwid",
    "Triber":        "https://www.cardekho.com/renault/triber",
    "Kiger":         "https://www.cardekho.com/renault/kiger",
    "Duster":        "https://www.cardekho.com/renault/duster",
    "Lodgy":         None,
    "Kushaq":        "https://www.cardekho.com/skoda/kushaq",
    "Slavia":        "https://www.cardekho.com/skoda/slavia",
    "Rapid":         None,
    "Octavia":       "https://www.cardekho.com/skoda/octavia",
    "Superb":        None,
    "Tiago":         "https://www.cardekho.com/tata/tiago",
    "Altroz":        "https://www.cardekho.com/tata/altroz",
    "Punch":         "https://www.cardekho.com/tata/punch",
    "Nexon":         "https://www.cardekho.com/tata/nexon",
    "Harrier":       "https://www.cardekho.com/tata/harrier",
    "Fortuner":      "https://www.cardekho.com/toyota/fortuner",
    "Innova":        "https://www.cardekho.com/toyota/innova-hycross",
    "Glanza":        "https://www.cardekho.com/toyota/glanza",
    "Urban Cruiser": "https://www.cardekho.com/toyota/urban-cruiser-hyryder",
    "Camry":         "https://www.cardekho.com/toyota/camry",
    "Tiguan":        "https://www.cardekho.com/volkswagen/tiguan",
    "Taigun":        "https://www.cardekho.com/volkswagen/taigun",
    "Virtus":        "https://www.cardekho.com/volkswagen/virtus",
    "Polo":          None,
    "Vento":         None,
}


def parse_transmissions(html: str) -> set[str] | None:
    raw = re.findall(r'"transmissionType"\s*:\s*"([^"]{2,60})"', html)
    trans: set[str] = set()
    for val in raw:
        vl = val.lower()
        if "manual" in vl:    trans.add("Manual")
        if "automatic" in vl: trans.add("Automatic")
    return trans if trans else None


def fetch_transmissions(session: requests.Session, model: str, url: str) -> tuple[str, set[str] | None]:
    try:
        r = session.get(url, timeout=15)
        time.sleep(DELAY)
        if r.status_code != 200:
            return model, None
        return model, parse_transmissions(r.text)
    except requests.RequestException:
        return model, None


def last_run_hours_ago() -> float:
    if not os.path.exists(CACHE_FILE):
        return float("inf")
    try:
        with open(CACHE_FILE) as f:
            ts = json.load(f).get("last_run", "")
        return (datetime.now() - datetime.fromisoformat(ts)).total_seconds() / 3600
    except Exception:
        return float("inf")


def save_last_run():
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, "w") as f:
        json.dump({"last_run": datetime.now().isoformat()}, f)


def main(force: bool = False):
    hrs = last_run_hours_ago()
    if not force and hrs < MIN_REFRESH_HRS:
        log.info(f"Last transmission refresh was {hrs:.0f}h ago. Use --force to override.")
        return

    log.info("=" * 60)
    log.info(f"Transmission refresh started — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    log.info("=" * 60)

    t0 = time.time()
    active = {m: u for m, u in MODEL_URLS.items() if u is not None}

    # ── Parallel fetch ─────────────────────────────────────────────────────────
    results: dict[str, set[str] | None] = {}

    with requests.Session() as session:
        session.headers.update(HEADERS)
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            futures = {pool.submit(fetch_transmissions, session, m, u): m for m, u in active.items()}
            for future in as_completed(futures):
                model, trans = future.result()
                results[model] = trans
                if trans:
                    log.info(f"  OK    {model:<16} {sorted(trans)}")
                else:
                    log.warning(f"  FAIL  {model:<16} keeping existing values")

    # ── DB update (single transaction) ────────────────────────────────────────
    db = SessionLocal()
    try:
        updated_models = failed = 0

        for model, valid_trans in results.items():
            if not valid_trans:
                failed += 1
                continue

            cars = db.query(Car).filter(Car.model == model).all()
            if not cars:
                continue

            reassigned = 0
            for car in cars:
                # Electric cars are always Automatic — never reassign
                if car.fuel_type == "Electric":
                    car.transmission = "Automatic"
                    continue
                if car.transmission not in valid_trans:
                    car.transmission = random.choice(sorted(valid_trans))
                    reassigned += 1

            if reassigned:
                log.info(f"  FIX   {model:<16} {reassigned} rows reassigned → valid: {sorted(valid_trans)}")
            updated_models += 1

        db.commit()

        elapsed = time.time() - t0
        log.info("-" * 60)
        log.info(f"Done in {elapsed:.1f}s.  Updated: {updated_models}  |  Failed (kept): {failed}")
        log.info("=" * 60)
        save_last_run()

    finally:
        db.close()


if __name__ == "__main__":
    force = "--force" in sys.argv
    main(force=force)
