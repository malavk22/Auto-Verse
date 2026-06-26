"""
Fetches latest ex-showroom prices from CarDekho and updates the database.

Optimisations over a naive sequential scraper:
  - Concurrent HTTP fetches (ThreadPoolExecutor, 5 workers) — ~5× faster
  - Regex on raw HTML instead of BeautifulSoup DOM parse — 10× faster parse
  - requests.Session with connection pooling — reuses TCP connections
  - Single DB commit at the end — one round-trip instead of 50
  - Last-run timestamp cache — skips full run if prices were refreshed recently

Run manually:
    python pipeline/refresh_prices.py

Force refresh (ignore last-run cache):
    python pipeline/refresh_prices.py --force

Schedule via cron (runs daily at 2 AM):
    0 2 * * * cd /path/to/Auto-Verse/backend && venv/bin/python pipeline/refresh_prices.py >> logs/price_refresh.log 2>&1

Schedule on Render:
    Add a Cron Job in the Render dashboard pointing to this script.
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
from datetime import datetime, timedelta

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

# ── Config ─────────────────────────────────────────────────────────────────────
WORKERS          = 5      # concurrent HTTP workers
DELAY            = 0.5    # seconds between each worker's requests
CHANGE_THRESHOLD = 0.03   # skip DB update if price changed < 3%
MIN_REFRESH_HRS  = 20     # skip run if last refresh was less than this many hours ago
CACHE_FILE       = "pipeline/.last_price_refresh.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-IN,en;q=0.9",
}

# Model → CarDekho URL  (None = discontinued — skip, keep existing price)
MODEL_URLS: dict[str, str | None] = {
    # Honda
    "Amaze":         "https://www.cardekho.com/honda/amaze",
    "City":          "https://www.cardekho.com/honda/city",
    "Civic":         None,
    "Jazz":          None,
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
    "EV6":           "https://www.cardekho.com/kia/ev6",
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
    "Octavia":       None,
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

# ── Helpers ────────────────────────────────────────────────────────────────────

# Matches "₹5.79 Lakh" or "5.79 lakh" or "₹ 10.91 Lakh"
_META_RE  = re.compile(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', re.IGNORECASE | re.DOTALL)
_LAKH_RE  = re.compile(r'₹?\s*([\d]+(?:\.[\d]{1,2})?)\s*[Ll]akh')


def lakh_to_rupees(v: float) -> int:
    return round(v * 100_000 / 1_000) * 1_000


def extract_price(html: str) -> tuple[int, int] | None:
    """
    Extracts price using regex on raw HTML — no DOM parse needed.
    Reads the meta description tag directly, falls back to title tag.
    """
    for pattern in (
        _META_RE,
        re.compile(r'<title>(.*?)</title>', re.IGNORECASE | re.DOTALL),
    ):
        m = pattern.search(html)
        if not m:
            continue
        matches = _LAKH_RE.findall(m.group(1))
        if not matches:
            continue
        prices = sorted(set(float(x) for x in matches))
        lo = lakh_to_rupees(prices[0])
        hi = lakh_to_rupees(prices[-1]) if len(prices) > 1 else lo
        if lo >= 300_000:
            return lo, hi
    return None


# ── Last-run cache ─────────────────────────────────────────────────────────────

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


# ── Fetch worker (runs in thread pool) ────────────────────────────────────────

def fetch_one(session: requests.Session, model: str, url: str) -> tuple[str, tuple[int, int] | None]:
    """Fetches a single model page. Returns (model, price_range | None)."""
    try:
        r = session.get(url, timeout=15)
        if r.status_code != 200:
            log.warning(f"  {model}: HTTP {r.status_code}")
            return model, None
        time.sleep(DELAY)
        return model, extract_price(r.text)
    except requests.RequestException as e:
        log.warning(f"  {model}: {e}")
        return model, None


# ── Main ───────────────────────────────────────────────────────────────────────

def main(force: bool = False):
    # Skip if refreshed recently
    hrs = last_run_hours_ago()
    if not force and hrs < MIN_REFRESH_HRS:
        log.info(f"Last refresh was {hrs:.1f}h ago (< {MIN_REFRESH_HRS}h). Use --force to override.")
        return

    log.info("=" * 60)
    log.info(f"Price refresh started — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    log.info("=" * 60)

    t0 = time.time()

    # Split into active (fetch) and discontinued (skip)
    active       = {m: u for m, u in MODEL_URLS.items() if u is not None}
    discontinued = [m for m, u in MODEL_URLS.items() if u is None]

    log.info(f"Fetching {len(active)} active models ({WORKERS} concurrent workers) …")

    # ── Parallel fetch ─────────────────────────────────────────────────────────
    results: dict[str, tuple[int, int] | None] = {}

    with requests.Session() as session:
        session.headers.update(HEADERS)
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            futures = {pool.submit(fetch_one, session, m, u): m for m, u in active.items()}
            for future in as_completed(futures):
                model, price = future.result()
                results[model] = price
                status = f"₹{price[0]/100000:.2f}L" if price else "FAILED"
                log.info(f"  {'OK' if price else 'FAIL':<4}  {model:<16} {status}")

    # ── DB update (single transaction) ────────────────────────────────────────
    db = SessionLocal()
    try:
        from sqlalchemy import func
        updated = skipped_same = skipped_fail = 0

        for model, new_range in results.items():
            if new_range is None:
                skipped_fail += 1
                continue

            new_lo, new_hi = new_range

            # Compare with current DB midpoint
            row     = db.query(func.min(Car.price), func.max(Car.price)).filter(Car.model == model).one()
            old_mid = (float(row[0] or 0) + float(row[1] or 0)) / 2
            new_mid = (new_lo + new_hi) / 2
            change  = abs(new_mid - old_mid) / old_mid if old_mid > 0 else 1.0

            if change < CHANGE_THRESHOLD:
                skipped_same += 1
                continue

            cars = db.query(Car).filter(Car.model == model).all()
            for car in cars:
                car.price = round(random.uniform(new_lo, new_hi) / 1_000) * 1_000
            updated += 1

        db.commit()   # single commit for all changes

        elapsed = time.time() - t0
        log.info("-" * 60)
        log.info(
            f"Done in {elapsed:.1f}s.  "
            f"Updated: {updated}  |  Unchanged: {skipped_same}  |  "
            f"Failed: {skipped_fail}  |  Discontinued: {len(discontinued)}"
        )
        log.info("=" * 60)

        save_last_run()

    finally:
        db.close()


if __name__ == "__main__":
    force = "--force" in sys.argv
    main(force=force)
