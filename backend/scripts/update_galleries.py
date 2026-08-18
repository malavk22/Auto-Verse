"""
Fills in real multi-photo CarDekho galleries for 10 models stuck with a
single leftover Wikipedia photo from the original dataset. All URLs
verified to resolve. Updates existing rows by brand+model (doesn't insert
new cars, unlike seed_new_cars.py).

Usage (from backend/, venv active, DATABASE_URL configured):
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
