"""
Second expansion batch: fills out the thinnest existing brand lineups
(Jaguar was checked and skipped - see below) and adds two new brands that
cover segments nothing else in the dataset does (Isuzu = pickup trucks,
Force Motors = hardcore off-roader/premium van).

Every car below is confirmed currently on sale in India (CarDekho, checked
2026-08-17) - several near-misses were caught and corrected during
research, not just assumed from a first search pass:
  - Volvo XC40 is discontinued (Nov 2023); its real successor, the EC40
    (formerly C40 Recharge), is used instead.
  - Isuzu's old combined "D-Max V-Cross" nameplate is discontinued (May
    2021); the current lineup sells them as separate models - "V-Cross"
    (updated Feb 2026) and "D-Max" are now distinct. V-Cross + MU-X used
    here as the two most representative/recognizable current models.
  - Jaguar was evaluated for 2 more models (F-Type, XF) - both are
    confirmed discontinued (Nov 2024 and Jul 2023 respectively), so
    Jaguar gets nothing added here rather than an inaccurate entry.
  - Nissan and Jeep each only had 1 more genuinely current model to add
    (Gravite, Grand Cherokee) rather than the planned 2 - their real
    lineups in India are just that small.

Where a spec (mileage, service cost) wasn't explicitly published by the
source, it's estimated or left as None rather than guessed with false
precision - same policy as seed_new_cars.py.

Idempotent: running this multiple times will not create duplicate rows,
it skips any (brand, model, year) combination that already exists.

Usage (from backend/, with the venv active and DATABASE_URL configured):
    python -m scripts.seed_new_cars_2
"""
import json
from decimal import Decimal

from sqlalchemy import func, text

from app.database import SessionLocal
from app.models.car import Brand, Car

EXT = "https://stimg.cardekho.com/images/carexteriorimages/930x620"
INT = "https://stimg.cardekho.com/images/carinteriorimages/930x620"


def car(brand, model, year, fuel_type, transmission, price, mileage, engine_cc,
        seats, service_cost, gallery):
    """gallery[0] doubles as the hero image_url (just at a smaller crop size)."""
    return dict(
        brand=brand, model=model, year=year, fuel_type=fuel_type, transmission=transmission,
        price=Decimal(price), mileage=Decimal(mileage) if mileage else None,
        engine_cc=engine_cc, seats=seats, service_cost=Decimal(service_cost),
        image_url=gallery[0].replace("930x620", "630x420"),
        gallery=gallery,
    )


CARS = [
    # ==================== MINI ====================
    car("MINI", "Cooper Convertible", 2026, "Petrol", "Automatic", "5900000", "16.82", 1998, 4, "58000", [
        f"{EXT}/Mini/Cooper-Convertible/13122/1765541689610/front-left-side-47.jpg",
        f"{EXT}/Mini/Cooper-Convertible/13122/1765541689610/rear-right-side-48.jpg",
        f"{EXT}/Mini/Cooper-Convertible/13122/1765541689610/rear-left-view-121.jpg",
        f"{INT}/Mini/Cooper-Convertible/13122/1765541736608/dashboard-59.jpg",
        f"{INT}/Mini/Cooper-Convertible/13122/1765541736608/steering-wheel-54.jpg"]),
    car("MINI", "Countryman Electric", 2026, "Electric", "Automatic", "5565000", None, None, 5, "9500", [
        f"{EXT}/Mini/Countryman-Electric/5191/1769679539585/front-left-side-47.jpg",
        f"{EXT}/Mini/Countryman-Electric/5191/1721906555943/rear-view-119.jpg",
        f"{EXT}/Mini/Countryman-Electric/5191/1721906555943/side-view-(right)-38.jpg",
        f"{INT}/Mini/Countryman-Electric/5191/1721906299902/dashboard-59.jpg",
        f"{INT}/Mini/Countryman-Electric/5191/1721906299902/infotainment-system-main-menu-183.jpg"]),

    # ==================== Porsche ====================
    car("Porsche", "911", 2026, "Petrol", "Automatic", "20000000", None, 2981, 4, "85000", [
        f"{EXT}/Porsche/911/11757/1762933836560/front-left-side-47.jpg",
        f"{EXT}/Porsche/911/11757/1762933836560/rear-left-view-121.jpg",
        f"{EXT}/Porsche/911/11757/1762933836560/rear-right-side-48.jpg",
        f"{INT}/Porsche/911/11757/1762933909751/dashboard-59.jpg",
        f"{INT}/Porsche/911/11757/1762933909751/steering-wheel-54.jpg"]),
    car("Porsche", "Panamera", 2026, "Hybrid", "Automatic", "17100000", None, 2894, 4, "75000", [
        f"{EXT}/Porsche/Panamera/11350/1769058657161/front-left-side-47.jpg",
        f"{EXT}/Porsche/Panamera/11350/1701081788330/rear-left-view-121.jpg",
        f"{EXT}/Porsche/Panamera/11350/1701081788330/rear-right-side-48.jpg",
        f"{INT}/Porsche/Panamera/11350/1701081714848/dashboard-59.jpg",
        f"{INT}/Porsche/Panamera/11350/1701081714848/rear-seats-52.jpg"]),

    # ==================== Volvo ====================
    # EC40 (formerly C40 Recharge) instead of XC40 - XC40 confirmed
    # discontinued Nov 2023, see module docstring.
    car("Volvo", "EC40", 2026, "Electric", "Automatic", "5900000", None, None, 5, "10500", [
        f"{EXT}/Volvo/EC40/9224/1784202073821/front-left-side-47.jpg",
        f"{EXT}/Volvo/EC40/9224/1784202073821/rear-left-view-121.jpg",
        f"{EXT}/Volvo/EC40/9224/1784202073821/rear-view-119.jpg",
        f"{INT}/Volvo/EC40/9224/1752650531042/dashboard-59.jpg",
        f"{INT}/Volvo/EC40/9224/1752650531042/steering-wheel-54.jpg"]),
    car("Volvo", "XC90", 2026, "Petrol", "Automatic", "9780000", "12.35", 1969, 7, "28000", [
        f"{EXT}/Volvo/XC90/11977/1779873124180/front-left-side-47.jpg",
        f"{EXT}/Volvo/XC90/11977/1779873124180/rear-left-view-121.jpg",
        f"{EXT}/Volvo/XC90/11977/1779873124180/rear-right-side-48.jpg",
        f"{INT}/Volvo/XC90/11977/1779872878045/dashboard-59.jpg",
        f"{INT}/Volvo/XC90/11977/1779872878045/steering-wheel-54.jpg"]),

    # ==================== Land Rover ====================
    car("Land Rover", "Range Rover Sport", 2026, "Diesel", "Automatic", "14300000", None, 2997, 5, "65000", [
        f"{EXT}/Land-Rover/Range-Rover-Sport/13566/1778735603557/front-view-118.jpg",
        f"{EXT}/Land-Rover/Range-Rover-Sport/13566/1778735603557/rear-left-view-121.jpg",
        f"{EXT}/Land-Rover/Range-Rover-Sport/13566/1778735603557/rear-right-side-48.jpg",
        f"{INT}/Land-Rover/Range-Rover-Sport/13566/1778735358824/dashboard-59.jpg",
        f"{INT}/Land-Rover/Range-Rover-Sport/13566/1778735358824/steering-wheel-54.jpg"]),
    car("Land Rover", "Range Rover", 2026, "Diesel", "Automatic", "24000000", None, 2997, 5, "78000", [
        f"{EXT}/Land-Rover/Range-Rover/12533/1775802721227/front-view-118.jpg",
        f"{EXT}/Land-Rover/Range-Rover/12533/1775802721227/rear-left-view-121.jpg",
        f"{EXT}/Land-Rover/Range-Rover/12533/1775802721227/front-right-view-120.jpg",
        f"{INT}/Land-Rover/Range-Rover/11540/1719038444169/dashboard-59.jpg",
        f"{INT}/Land-Rover/Range-Rover/11540/1719038444169/steering-wheel-54.jpg"]),

    # ==================== Lexus ====================
    car("Lexus", "RX", 2026, "Hybrid", "Automatic", "8999000", None, 2487, 5, "22000", [
        f"{EXT}/Lexus/RX/11359/1701686322470/front-view-118.jpg",
        f"{EXT}/Lexus/RX/11359/1701686322470/rear-left-view-121.jpg",
        f"{EXT}/Lexus/RX/11359/1701686322470/rear-right-side-48.jpg",
        f"{INT}/Lexus/RX/11359/1701686203815/dashboard-59.jpg",
        f"{INT}/Lexus/RX/11359/1701686203815/steering-wheel-54.jpg"]),
    car("Lexus", "LX", 2026, "Diesel", "Automatic", "28100000", None, 3346, 5, "68000", [
        f"{EXT}/Lexus/LX/8657/1769081229491/front-left-side-47.jpg",
        f"{EXT}/Lexus/LX/8657/1780658020428/exterior-image-164.jpg",
        f"{EXT}/Lexus/LX/8657/1750068185100/exterior-image-165.jpg",
        f"{INT}/Lexus/LX/8657/1671778525634/steering-wheel-54.jpg",
        f"{INT}/Lexus/LX/8657/1671778525634/door-view-of-driver-seat-51.jpg"]),

    # ==================== BMW ====================
    car("BMW", "5 Series", 2026, "Petrol", "Automatic", "7660000", None, 1998, 5, "32000", [
        f"{EXT}/BMW/5-Series/10182/1762506368495/front-left-side-47.jpg",
        f"{EXT}/BMW/5-Series/10182/1762506368495/rear-left-view-121.jpg",
        f"{EXT}/BMW/5-Series/10182/1762506368495/rear-right-side-48.jpg",
        f"{INT}/BMW/5-Series/10182/1762506684675/dashboard-59.jpg",
        f"{INT}/BMW/5-Series/10182/1762506684675/steering-wheel-54.jpg"]),
    car("BMW", "X5", 2026, "Petrol", "Automatic", "9690000", None, 2998, 5, "38000", [
        f"{EXT}/BMW/X5/10490/1689853299825/front-view-118.jpg",
        f"{EXT}/BMW/X5/10490/1689853299825/rear-left-view-121.jpg",
        f"{EXT}/BMW/X5/10490/1689853299825/rear-right-side-48.jpg",
        f"{INT}/BMW/X5/10490/1689853374371/steering-wheel-54.jpg",
        f"{INT}/BMW/X5/10490/1689853374371/rear-seats-52.jpg"]),

    # ==================== Mercedes-Benz ====================
    car("Mercedes-Benz", "E-Class", 2026, "Diesel", "Automatic", "8000000", "15.00", 1993, 5, "30000", [
        f"{EXT}/Mercedes-Benz/E-Class/9790/1763471140336/front-left-side-47.jpg",
        f"{EXT}/Mercedes-Benz/E-Class/9790/1728652931654/exterior-image-165.jpg",
        f"{EXT}/Mercedes-Benz/E-Class/9790/1728652931654/exterior-image-166.jpg",
        f"{INT}/Mercedes-Benz/E-Class/9790/1728652976329/dashboard-59.jpg",
        f"{INT}/Mercedes-Benz/E-Class/9790/1728652976329/steering-wheel-54.jpg"]),
    car("Mercedes-Benz", "S-Class", 2026, "Hybrid", "Automatic", "22000000", "32.30", 2999, 5, "55000", [
        f"{EXT}/Mercedes-Benz/S-Class/13591/1781510460490/front-left-side-47.jpg",
        f"{EXT}/Mercedes-Benz/S-Class/13620/1781601128901/rear-left-view-121.jpg",
        f"{EXT}/Mercedes-Benz/S-Class/13620/1781601128901/rear-right-side-48.jpg",
        f"{INT}/Mercedes-Benz/S-Class/13591/1781600882882/dashboard-59.jpg",
        f"{INT}/Mercedes-Benz/S-Class/13591/1781600882882/steering-wheel-54.jpg"]),

    # ==================== Nissan (only 1 more real model - see docstring) ====================
    car("Nissan", "Gravite", 2026, "CNG", "Manual", "573000", None, 999, 7, "9500", [
        f"{EXT}/Nissan/Gravite/13542/1778321066860/front-left-side-47.jpg",
        f"{EXT}/Nissan/Gravite/9673/1774255950200/rear-left-view-121.jpg",
        f"{EXT}/Nissan/Gravite/9673/1774255950200/front-view-118.jpg",
        f"{INT}/Nissan/Gravite/9673/1774259639976/dashboard-59.jpg",
        f"{INT}/Nissan/Gravite/9673/1774259639976/steering-wheel-54.jpg"]),

    # ==================== Jeep (only 1 more real model - see docstring) ====================
    car("Jeep", "Grand Cherokee", 2026, "Petrol", "Automatic", "6300000", None, 1995, 5, "42000", [
        f"{EXT}/Jeep/Grand-Cherokee/10945/1767782308966/front-left-side-47.jpg",
        f"{EXT}/Jeep/Grand-Cherokee/10945/1690624307755/rear-right-side-48.jpg",
        f"{EXT}/Jeep/Grand-Cherokee/8752/1749460060943/exterior-image-167.jpg",
        f"{INT}/Jeep/Grand-Cherokee/10945/1690624271643/steering-wheel-54.jpg",
        f"{INT}/Jeep/Grand-Cherokee/10945/1690624271643/door-view-of-driver-seat-51.jpg"]),

    # ==================== Isuzu (new brand - pickup trucks) ====================
    car("Isuzu", "V-Cross", 2026, "Diesel", "Manual", "2550000", "12.40", 1898, 5, "14000", [
        f"{EXT}/Isuzu/V-Cross/9893/1771917718997/front-left-side-47.jpg",
        f"{EXT}/Isuzu/V-Cross/9893/1771917718997/rear-right-side-48.jpg",
        f"{EXT}/Isuzu/V-Cross/9893/1771917718997/exterior-image-164.jpg",
        f"{INT}/Isuzu/V-Cross/9893/1771917780726/dashboard-59.jpg",
        f"{INT}/Isuzu/V-Cross/9893/1771917780726/steering-wheel-54.jpg"]),
    car("Isuzu", "MU-X", 2026, "Diesel", "Automatic", "3453000", "13.00", 1898, 7, "18000", [
        f"{EXT}/Isuzu/MU-X/9889/1770884795804/front-left-side-47.jpg",
        f"{EXT}/Isuzu/MU-X/9889/1779943126132/rear-left-view-121.jpg",
        f"{EXT}/Isuzu/MU-X/9889/1779943126132/front-right-view-120.jpg",
        f"{INT}/Isuzu/MU-X/9889/1681734009445/dashboard-59.jpg",
        f"{INT}/Isuzu/MU-X/9889/1681734009445/rear-seats-52.jpg"]),

    # ==================== Force Motors (new brand - off-roader/premium van) ====================
    car("Force Motors", "Gurkha", 2026, "Diesel", "Manual", "1631000", None, 2596, 4, "13000", [
        f"{EXT}/Force/Gurkha/10634/1755764551465/front-left-side-47.jpg",
        f"{EXT}/Force/Gurkha/10634/1772535297377/exterior-image-164.jpg",
        f"{EXT}/Force/Gurkha/10634/1772535297377/wheel-42.jpg",
        f"{INT}/Force/Gurkha/10634/1772535246157/dashboard-59.jpg",
        f"{INT}/Force/Gurkha/10634/1772535246157/steering-wheel-54.jpg"]),
    car("Force Motors", "Urbania", 2026, "Diesel", "Manual", "2634000", "11.00", 2596, 11, "16000", [
        f"{EXT}/Force/Urbania/11849/1763466348855/front-left-side-47.jpg",
        f"{EXT}/Force/Urbania/11851/1775801172985/front-view-118.jpg",
        f"{EXT}/Force/Urbania/11851/1775801172985/exterior-image-164.jpg",
        f"{INT}/Force/Urbania/11849/Force-Urbania-3350WB-10Str/1721025336193/dashboard-59.jpg"]),
]


def run():
    db = SessionLocal()
    try:
        # brands/cars use explicit ids (not an identity column) - same
        # raw-SQL approach as seed_new_cars.py, sidestepping SQLAlchemy's
        # MSSQL dialect trying to (incorrectly) issue SET IDENTITY_INSERT
        # for a non-identity column.
        next_brand_id = (db.query(func.max(Brand.id)).scalar() or 0) + 1
        next_car_id = (db.query(func.max(Car.id)).scalar() or 0) + 1

        insert_brand = text("INSERT INTO brands (id, name) VALUES (:id, :name)")
        insert_car = text("""
            INSERT INTO cars (id, brand_id, model, year, fuel_type, transmission, price, mileage,
                               engine_cc, seats, service_cost, image_url, gallery_images,
                               view_count, compare_count, is_active, created_at)
            VALUES (:id, :brand_id, :model, :year, :fuel_type, :transmission, :price, :mileage,
                    :engine_cc, :seats, :service_cost, :image_url, :gallery_images, 0, 0, 1, :created_at)
        """)

        added, skipped = 0, 0
        for entry in CARS:
            brand = db.query(Brand).filter(Brand.name == entry["brand"]).first()
            if not brand:
                db.execute(insert_brand, {"id": next_brand_id, "name": entry["brand"]})
                brand = Brand(id=next_brand_id, name=entry["brand"])
                print(f"+ new brand: {entry['brand']}")
                next_brand_id += 1

            exists = (
                db.query(Car)
                .filter(Car.brand_id == brand.id, Car.model == entry["model"], Car.year == entry["year"])
                .first()
            )
            if exists:
                skipped += 1
                continue

            db.execute(insert_car, {
                "id": next_car_id,
                "brand_id": brand.id,
                "model": entry["model"],
                "year": entry["year"],
                "fuel_type": entry["fuel_type"],
                "transmission": entry["transmission"],
                "price": entry["price"],
                "mileage": entry["mileage"],
                "engine_cc": entry["engine_cc"],
                "seats": entry["seats"],
                "service_cost": entry["service_cost"],
                "image_url": entry["image_url"],
                "gallery_images": json.dumps(entry["gallery"]),
                "created_at": "2026-08-17 00:00:00",
            })
            added += 1
            next_car_id += 1

        db.commit()
        print(f"Done. Added {added} cars, skipped {skipped} already present.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
