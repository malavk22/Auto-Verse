"""
Update script: fills in real multi-photo galleries for the 10 models that
were stuck with a single Wikipedia Commons photo left over from the
original 10,000-row dataset (before the later expansion started sourcing
proper CarDekho exterior/interior galleries per model).

All URLs below were pulled from each model's actual CarDekho photo gallery
page and verified to resolve (HTTP 200) before being added here. One
exception: Renault Lodgy only has a single real photo on CarDekho at all -
it's a long-discontinued model there, not a gap in this script.

Hyundai i10 note: CarDekho's own "i10" page has only one photo (also a
thin, mostly-discontinued listing there) - the same generation the dataset
already shows (per the original Wikipedia photo, "i10 (III)") is sold in
India as the Grand i10 Nios, which has a full real gallery, so that's used
instead of a bare single photo.

Updates existing rows (by brand+model) rather than inserting new ones -
unlike seed_new_cars.py, which adds cars that don't exist yet.

Usage (from backend/, with the venv active and DATABASE_URL configured):
    python scripts/update_galleries.py
"""
import json

from app.database import SessionLocal
from app.models.car import Brand, Car

EXT = "https://stimg.cardekho.com/images/carexteriorimages/930x620"
INT = "https://stimg.cardekho.com/images/carinteriorimages/930x620"

GALLERIES = {
    ("Honda", "Civic"): [
        f"{EXT}/Honda/Civic/7740/1585801296746/front-left-side-47.jpg",
        f"{EXT}/Honda/Civic/7740/1585801296746/rear-right-side-48.jpg",
        f"{EXT}/Honda/Civic/7742/1597221770778/rear-view-119.jpg",
        f"{INT}/Honda/Civic/7740/1585801377472/dashboard-59.jpg",
        f"{INT}/Honda/Civic/7740/1585801377472/instrument-cluster-62.jpg",
    ],
    ("Honda", "Jazz"): [
        f"{EXT}/Honda/Jazz/6489/1677825341880/front-left-side-47.jpg",
        f"{EXT}/Honda/Jazz/6489/1609234198234/rear-right-side-48.jpg",
        f"{EXT}/Honda/Jazz/6489/1609234198234/rear-view-119.jpg",
        f"{INT}/Honda/Jazz-2020/6489/1597048830935/steering-wheel-54.jpg",
        f"{INT}/Honda/Jazz-2020/6489/1597048830935/gear-shifter-87.jpg",
    ],
    ("Honda", "WR-V"): [
        f"{EXT}/Honda/WR-V/7665/1645419998984/front-left-side-47.jpg",
        f"{EXT}/Honda/WR-V/7665/1597226924052/rear-view-119.jpg",
        f"{EXT}/Honda/WRV/7665/1593678251480/rear-right-side-48.jpg",
        f"{INT}/Honda/WR-V/7665/1597227308959/dashboard-59.jpg",
        f"{INT}/Honda/WRV/7665/1593678364126/steering-wheel-54.jpg",
    ],
    ("Hyundai", "i10"): [
        f"{EXT}/Hyundai/Grand-i10-Nios/10088/1762430432997/front-left-side-47.jpg",
        f"{EXT}/Hyundai/Grand-i10-Nios/10096/1684298344769/rear-view-119.jpg",
        f"{EXT}/Hyundai/Grand-i10-Nios/10096/1684298344769/rear-right-side-48.jpg",
        f"{INT}/Hyundai/Grand-i10-Nios/10096/1684298105714/dashboard-59.jpg",
        f"{INT}/Hyundai/Grand-i10-Nios/10096/1684298105714/steering-wheel-54.jpg",
    ],
    ("Jaguar", "F-Pace"): [
        f"{EXT}/Jaguar/F-Pace/10644/1755774688332/front-left-side-47.jpg",
        f"{EXT}/Jaguar/F-Pace/10644/1750059519742/exterior-image-165.jpg",
        f"{EXT}/Jaguar/F-Pace/10644/1690012005728/headlight-43.jpg",
        f"{INT}/Jaguar/F-Pace/10644/1690011966066/door-view-of-driver-seat-51.jpg",
        f"{INT}/Jaguar/F-Pace/10644/1690011966066/infotainment-system-main-menu-183.jpg",
    ],
    ("Kia", "EV6"): [
        f"{EXT}/Kia/EV6/11740/1760005604163/front-left-side-47.jpg",
        f"{EXT}/Kia/EV6/11740/1760005604163/rear-view-119.jpg",
        f"{EXT}/Kia/EV6/11740/1760005604163/rear-right-side-48.jpg",
        f"{INT}/Kia/EV6/11740/1760005358736/dashboard-59.jpg",
        f"{INT}/Kia/EV6/11740/1760005358736/steering-wheel-54.jpg",
    ],
    ("Renault", "Lodgy"): [
        # Only real photo CarDekho has for this discontinued model - not a
        # sourcing gap, this is the whole catalog.
        f"{EXT}/Renault/Renault-Lodgy/047.jpg",
    ],
    ("Skoda", "Octavia"): [
        f"{EXT}/Skoda/Octavia/8447/1623323312913/front-left-side-47.jpg",
        f"{EXT}/Skoda/Octavia/8447/1623323312913/rear-view-119.jpg",
        f"{EXT}/Skoda/Octavia/8447/1623323312913/rear-right-side-48.jpg",
        f"{INT}/Skoda/Octavia/8447/1623323199013/dashboard-59.jpg",
        f"{INT}/Skoda/Octavia/8447/1623323199013/steering-wheel-54.jpg",
    ],
    ("Skoda", "Rapid"): [
        f"{EXT}/Skoda/Rapid/8633/1648729171661/front-left-side-47.jpg",
        f"{EXT}/Skoda/Rapid/8633/1648729171661/rear-view-119.jpg",
        f"{EXT}/Skoda/Rapid/8633/1648729171661/side-view-(right)-38.jpg",
        f"{INT}/Skoda/Rapid/8633/1648729234444/dashboard-59.jpg",
        f"{INT}/Skoda/Rapid/8633/1648729234444/steering-wheel-54.jpg",
    ],
    ("Skoda", "Superb"): [
        f"{EXT}/Skoda/Superb/9928/1712138063999/front-left-side-47.jpg",
        f"{EXT}/Skoda/Superb/9928/1712138063999/exterior-image-165.jpg",
        f"{EXT}/Skoda/Superb/9928/1712138063999/headlight-43.jpg",
        f"{INT}/Skoda/Superb/9928/1712138001921/dashboard-59.jpg",
        f"{INT}/Skoda/Superb/9928/1712138001921/steering-wheel-54.jpg",
    ],
}


def run():
    db = SessionLocal()
    try:
        total_rows = 0
        for (brand_name, model), gallery in GALLERIES.items():
            brand = db.query(Brand).filter(Brand.name == brand_name).first()
            if not brand:
                print(f"! brand not found, skipping: {brand_name}")
                continue

            image_url = gallery[0].replace("930x620", "630x420")
            rows = (
                db.query(Car)
                .filter(Car.brand_id == brand.id, Car.model == model)
                .all()
            )
            if not rows:
                print(f"! no rows found for {brand_name} {model}, skipping")
                continue

            for row in rows:
                row.gallery_images = json.dumps(gallery)
                row.image_url = image_url

            total_rows += len(rows)
            print(f"+ {brand_name} {model}: {len(gallery)} photos -> {len(rows)} row(s) updated")

        db.commit()
        print(f"Done. {total_rows} rows updated across {len(GALLERIES)} models.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
