"""
Fetches showroom-quality images from CarWale CDN for each unique car model.
Run from the backend/ directory:
    python pipeline/fetch_images_carwale.py
"""

from __future__ import annotations

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
DELAY = 1.5

# CarWale URL slugs for each brand
BRAND_SLUGS = {
    "Honda":          "honda",
    "Hyundai":        "hyundai",
    "Kia":            "kia",
    "Mahindra":       "mahindra",
    "Maruti Suzuki":  "maruti-suzuki",
    "Renault":        "renault",
    "Skoda":          "skoda",
    "Tata Motors":    "tata",
    "Toyota":         "toyota",
    "Volkswagen":     "volkswagen",
}

# CarWale URL slugs for models that don't follow simple lowercasing
MODEL_SLUGS = {
    "WagonR":       "wagon-r",
    "WR-V":         "wr-v",
    "i10":          "grand-i10",
    "i20":          "i20",
    "EV6":          "ev6",
    "XUV300":       "xuv300",
    "XUV700":       "xuv700",
    "Scorpio":      "scorpio-n",
    "Innova":       "innova-crysta",
    "Urban Cruiser":"urban-cruiser-hyryder",
    "Taigun":       "taigun",
    "Virtus":       "virtus",
    "Tiguan":       "tiguan-allspace",
    "Vento":        "vento",
    "Polo":         "polo",
    "Lodgy":        "lodgy",
}


def model_to_slug(model: str) -> str:
    if model in MODEL_SLUGS:
        return MODEL_SLUGS[model]
    # default: lowercase, replace spaces with hyphens
    return model.lower().replace(" ", "-")


def extract_carwale_image(brand: str, model: str) -> str | None:
    brand_slug = BRAND_SLUGS.get(brand)
    if not brand_slug:
        return None

    model_slug = model_to_slug(model)
    url = f"https://www.carwale.com/{brand_slug}-cars/{model_slug}/"

    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return None

        # find all aeplcdn image URLs from the page
        matches = re.findall(r'imgd\.aeplcdn\.com/[\d]+x[\d]+/n/cw/ec/(\d+)/([^"&\s]+)', r.text)
        if not matches:
            return None

        # take the first exterior car image
        car_id, filename = matches[0]
        return f"https://imgd.aeplcdn.com/1056x594/n/cw/ec/{car_id}/{filename}?isig=0&q=80"

    except Exception:
        return None


def add_image_url_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE cars ADD COLUMN image_url VARCHAR(500)"))
            conn.commit()
        except Exception:
            pass


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

        print(f"Fetching CarWale showroom images for {len(combos)} models...\n")
        found = 0
        not_found = 0

        for brand_name, model in combos:
            url = extract_carwale_image(brand_name, model)

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

        print(f"\nDone. {found} models got showroom images, {not_found} not found.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
