"""
One-time script: fetches per-model car images from the Wikipedia REST API
and saves them to the cars table.

Run from the backend/ directory:
    python pipeline/fetch_images.py
"""

from __future__ import annotations

import sys
import time
import requests
from sqlalchemy import text

sys.path.insert(0, ".")
from app.database import engine, SessionLocal
from app.models.car import Car, Brand

WIKI_REST = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
DELAY = 0.4

# Wikipedia article titles that differ from "{brand} {model}"
MANUAL_OVERRIDES = {
    ("Honda", "Jazz"):              "Honda Fit",
    ("Maruti Suzuki", "WagonR"):    "Maruti Suzuki Wagon R",
    ("Volkswagen", "Vento"):        "Volkswagen Vento (India)",
}


def add_image_url_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE cars ADD COLUMN image_url VARCHAR(500)"))
            conn.commit()
            print("Added image_url column to cars table.")
        except Exception:
            pass  # column already exists


def is_image_too_old(url: str) -> bool:
    """Reject images whose filename contains a year before 2005."""
    import re
    years = [int(y) for y in re.findall(r'\b(19\d{2}|200[0-4])\b', url)]
    return bool(years)


def title_candidates(brand: str, model: str) -> list[str]:
    """Return Wikipedia title variations to try, most specific first."""
    # check manual overrides first
    if (brand, model) in MANUAL_OVERRIDES:
        return [MANUAL_OVERRIDES[(brand, model)]]

    candidates = []

    # e.g. "Honda City", "Maruti Suzuki Swift"
    candidates.append(f"{brand} {model}")

    # "Tata Motors Punch" → "Tata Punch"
    clean_brand = brand.replace("Motors", "").replace("  ", " ").strip()
    if clean_brand != brand:
        candidates.append(f"{clean_brand} {model}")

    # "Maruti Suzuki Swift" → also try "Suzuki Swift"
    if "Maruti Suzuki" in brand:
        candidates.append(f"Suzuki {model}")

    # just the model name as last resort
    candidates.append(model)

    return candidates


def fetch_wikipedia_image(title: str) -> str | None:
    url = WIKI_REST.format(title=title.replace(" ", "_"))
    try:
        r = requests.get(url, timeout=10, headers={"User-Agent": "AutoVerse/1.0"})
        if r.status_code != 200:
            return None
        data = r.json()
        # prefer original image, fall back to thumbnail
        img = data.get("originalimage") or data.get("thumbnail")
        if not img:
            return None
        source = img.get("source")
        if source and is_image_too_old(source):
            return None
        return source
    except Exception:
        return None


def main():
    add_image_url_column()

    db = SessionLocal()
    try:
        combos = (
            db.query(Brand.name, Car.model)
            .join(Car, Car.brand_id == Brand.id)
            .distinct()
            .all()
        )

        print(f"Found {len(combos)} unique brand + model combinations.\n")
        found = 0
        not_found = 0

        for brand_name, model in combos:
            url = None
            for candidate in title_candidates(brand_name, model):
                url = fetch_wikipedia_image(candidate)
                if url:
                    break
                time.sleep(DELAY)

            if url:
                db.query(Car).filter(
                    Car.model == model,
                    Car.brand.has(Brand.name == brand_name)
                ).update({"image_url": url}, synchronize_session=False)
                db.commit()
                print(f"  [OK]  {brand_name} {model}")
                found += 1
            else:
                print(f"  [--]  {brand_name} {model}")
                not_found += 1

            time.sleep(DELAY)

        print(f"\nDone. {found} models got images, {not_found} had no Wikipedia image.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
