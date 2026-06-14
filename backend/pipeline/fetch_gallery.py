"""
Fetches a 5-angle gallery per unique (brand, model, fuel_type) combination
from CarWale CDN and saves as JSON in the gallery_images column.

Run from the backend/ directory:
    python pipeline/fetch_gallery.py
"""

from __future__ import annotations

import json
import re
import sys
import time
import requests
from sqlalchemy import text

sys.path.insert(0, ".")
from app.database import engine, SessionLocal
from app.models.car import Car, Brand

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}
DELAY = 2.0

BRAND_SLUGS = {
    "Honda":         "honda",
    "Hyundai":       "hyundai",
    "Kia":           "kia",
    "Mahindra":      "mahindra",
    "Maruti Suzuki": "maruti-suzuki",
    "Renault":       "renault",
    "Skoda":         "skoda",
    "Tata Motors":   "tata",
    "Toyota":        "toyota",
    "Volkswagen":    "volkswagen",
}

MODEL_SLUGS = {
    "WagonR":        "wagon-r",
    "WR-V":          "wr-v",
    "i10":           "grand-i10",
    "i20":           "i20",
    "EV6":           "ev6",
    "XUV300":        "xuv300",
    "XUV700":        "xuv700",
    "Scorpio":       "scorpio-n",
    "Innova":        "innova-crysta",
    "Urban Cruiser": "urban-cruiser-hyryder",
    "Taigun":        "taigun",
    "Virtus":        "virtus",
    "Tiguan":        "tiguan-allspace",
    "Vento":         "vento",
    "Polo":          "polo",
    "Lodgy":         "lodgy",
}

# CarWale slugs for models that have a genuine EV variant sold in India.
# Any other model with fuel_type=Electric (synthetic data) uses the standard slug.
EV_MODEL_SLUGS = {
    "Nexon":         "nexon-ev",
    "Punch":         "punch-ev",
    "Creta":         "creta-electric",
    "XUV700":        "xuv400",          # Mahindra EV is actually XUV400
    "EV6":           "ev6",
    "Thar":          "thar-roxx",       # closest EV-adjacent Thar variant
}

WIKI_REST = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"

# Models where the Wikipedia main article shows the wrong era —
# use an alternate title instead
WIKI_OVERRIDES = {
    "Jazz": "Honda Fit",
}

# Generation cutoff years — cars with year < cutoff show current gen image
# (used only for the UI "representative image" badge, not scraping)
GENERATION_CUTOFFS = {
    "City":    2020,
    "Creta":   2020,
    "i20":     2020,
    "Swift":   2018,
    "Baleno":  2022,
    "Seltos":  2023,
    "Nexon":   2023,
    "Venue":   2023,
    "Altroz":  2021,
    "Thar":    2020,
}

ANGLE_PRIORITY = [
    "right-front-three-quarter",
    "left-front-three-quarter",
    "left-rear-three-quarter",
    "dashboard",
    "front-row-seats",
]


def model_to_slug(model: str, fuel_type: str) -> str:
    if fuel_type == "Electric" and model in EV_MODEL_SLUGS:
        return EV_MODEL_SLUGS[model]
    return MODEL_SLUGS.get(model, model.lower().replace(" ", "-"))


def pick_gallery(all_urls: list[str]) -> list[str]:
    gallery = []
    for keyword in ANGLE_PRIORITY:
        for url in all_urls:
            if keyword in url and url not in gallery:
                gallery.append(url)
                break
    for url in all_urls:
        if len(gallery) >= 5:
            break
        if url not in gallery:
            gallery.append(url)
    return gallery[:5]


def scrape_gallery(brand: str, model: str, fuel_type: str) -> list[str]:
    brand_slug = BRAND_SLUGS.get(brand)
    if not brand_slug:
        return []

    model_slug = model_to_slug(model, fuel_type)
    url = f"https://www.carwale.com/{brand_slug}-cars/{model_slug}/"

    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return []

        matches = re.findall(
            r'data-original=.https://imgd\.aeplcdn\.com/[\d]+x[\d]+/n/cw/ec/(\d+)/([^\'\"&\s]+)',
            r.text
        )
        seen = set()
        all_urls = []
        for car_id, filename in matches:
            clean = filename.split("?")[0]
            if clean not in seen and not any(x in clean for x in ["svg", "icon", "logo", "grey"]):
                seen.add(clean)
                all_urls.append(f"https://imgd.aeplcdn.com/1056x594/n/cw/ec/{car_id}/{clean}")

        return pick_gallery(all_urls)

    except Exception:
        return []


def wikipedia_fallback(brand: str, model: str) -> list[str]:
    """Single-image gallery from Wikipedia for models CarWale can't serve."""
    title = WIKI_OVERRIDES.get(model, f"{brand} {model}")
    # strip "Motors" for Tata
    title = title.replace("Motors ", "")
    url = WIKI_REST.format(title=title.replace(" ", "_"))
    try:
        r = requests.get(url, headers={"User-Agent": "AutoVerse/1.0"}, timeout=10)
        if r.status_code != 200:
            return []
        data = r.json()
        img = data.get("originalimage") or data.get("thumbnail")
        if not img:
            return []
        src = img.get("source", "")
        # reject clearly old images (year before 2005 in filename)
        import re as _re
        if _re.search(r'\b(19\d{2}|200[0-4])\b', src):
            return []
        return [src]
    except Exception:
        return []


def add_gallery_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE cars ADD COLUMN gallery_images TEXT"))
            conn.commit()
            print("Added gallery_images column.")
        except Exception:
            pass  # already exists


def main():
    add_gallery_column()
    db = SessionLocal()
    try:
        combos = (
            db.query(Brand.name, Car.model, Car.fuel_type)
            .join(Car, Car.brand_id == Brand.id)
            .distinct()
            .all()
        )

        print(f"Fetching galleries for {len(combos)} brand+model+fuel_type combos...\n")
        found = 0
        not_found = 0

        # cache results so duplicate slugs don't re-fetch
        cache: dict[str, list[str]] = {}

        for brand_name, model, fuel_type in combos:
            model_slug = model_to_slug(model, fuel_type or "")
            cache_key = f"{brand_name}|{model_slug}"

            if cache_key in cache:
                gallery = cache[cache_key]
            else:
                gallery = scrape_gallery(brand_name, model, fuel_type or "")
                cache[cache_key] = gallery
                time.sleep(DELAY)

            if not gallery:
                gallery = wikipedia_fallback(brand_name, model)
                if gallery:
                    cache[cache_key] = gallery

            if gallery:
                db.query(Car).filter(
                    Car.model == model,
                    Car.fuel_type == fuel_type,
                    Car.brand.has(Brand.name == brand_name)
                ).update({"gallery_images": json.dumps(gallery)}, synchronize_session=False)
                db.commit()
                label = f"Electric({model_slug})" if fuel_type == "Electric" else fuel_type
                src = "wiki" if len(gallery) == 1 and "wikipedia" in gallery[0] else "carwale"
                print(f"  [OK]  {brand_name} {model} [{label}]  ({len(gallery)} imgs, {src})")
                found += 1
            else:
                print(f"  [--]  {brand_name} {model} [{fuel_type}]")
                not_found += 1

        print(f"\nDone. {found}/{len(combos)} combos have galleries.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
