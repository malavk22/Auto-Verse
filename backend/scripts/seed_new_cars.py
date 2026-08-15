"""
Seed script: adds real 2024/2025/2026 India-market car listings that were
missing from the original 10,000-row dataset - both brand-new brands
(MG, Citroen, Jeep, Nissan, BYD, Mercedes-Benz, BMW, Audi, Volvo, Land
Rover, Jaguar, Lexus, Porsche, MINI) and additional recent models for
brands already present, so each brand's lineup isn't just one flagship
car (e.g. Audi previously only had the Q3; it now also has Q5, A4, A6).

Every car below is confirmed currently on sale in India (researched via
CarDekho / Autocar India / Team-BHP current pricing pages, not historical
data - e.g. Volvo XC40 is deliberately excluded because it's discontinued
in India, unlike XC60/EX30 which are still sold). Images are real
CarDekho exterior/interior photos, verified while researching each car.

Where a spec (mileage, engine displacement) wasn't explicitly stated by
the source, it's left as None rather than guessed - accuracy matters more
here than a complete-looking row (see the IRDAI depreciation fix earlier
in this project for why).

Idempotent: running this multiple times will not create duplicate rows,
it skips any (brand, model, year) combination that already exists.

Usage (from backend/, with the venv active and DATABASE_URL configured):
    python scripts/seed_new_cars.py
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
    # ==================== New brands ====================
    car("MG", "Windsor EV", 2025, "Electric", "Automatic", "1699000", None, None, 5, "9500", [
        f"{EXT}/MG/Windsor-EV/11848/1755845275936/front-left-side-47.jpg",
        f"{EXT}/MG/Windsor-EV/11848/1751545279539/rear-left-view-121.jpg",
        f"{INT}/MG/Windsor-EV/11848/1751545543860/dashboard-59.jpg",
        f"{INT}/MG/Windsor-EV/11848/1751545543860/steering-wheel-54.jpg",
        f"{INT}/MG/Windsor-EV/11848/1751545543860/cup-holder-side-view-126.jpg"]),
    car("MG", "Majestor", 2026, "Diesel", "Automatic", "4099000", "11.50", 1996, 7, "32000", [
        f"{EXT}/MG/Majestor/12370/1783329135195/front-left-side-47.jpg",
        f"{EXT}/MG/Majestor/12370/1777892956827/rear-right-side-48.jpg",
        f"{EXT}/MG/Majestor/12370/1777892956827/rear-left-view-121.jpg",
        f"{INT}/MG/Majestor/12370/1777892453031/dashboard-59.jpg",
        f"{INT}/MG/Majestor/12370/1777892453031/steering-wheel-54.jpg"]),
    car("MG", "Hector", 2025, "Petrol", "Automatic", "1450000", None, 1451, 5, "16000", [
        f"{EXT}/MG/Hector/13125/1783321472876/front-left-side-47.jpg",
        f"{INT}/MG/Hector/13125/1765801744105/dashboard-59.jpg",
        f"{INT}/MG/Hector/13125/1765801744105/steering-wheel-54.jpg"]),
    car("MG", "Astor", 2025, "Petrol", "Automatic", "1350000", "15.00", 1498, 5, "13500", [
        f"{EXT}/MG/Astor/11413/1762752659543/front-left-side-47.jpg",
        f"{INT}/MG/Astor/11413/1719382938410/dashboard-59.jpg",
        f"{INT}/MG/Astor/11413/1719382938410/steering-wheel-54.jpg"]),

    car("Citroen", "Basalt", 2025, "Petrol", "Automatic", "1099000", "17.60", 1199, 5, "11000", [
        f"{EXT}/Citroen/Basalt/11943/1764762132715/front-left-side-47.jpg",
        f"{EXT}/Citroen/Basalt/11943/1764762197529/rear-right-side-48.jpg",
        f"{EXT}/Citroen/Basalt/11943/1764762197529/rear-left-view-121.jpg",
        f"{INT}/Citroen/Basalt/11943/1764762262276/dashboard-59.jpg",
        f"{INT}/Citroen/Basalt/11943/1764762336202/steering-wheel-54.jpg"]),
    car("Citroen", "C3 Aircross", 2025, "Petrol", "Manual", "999000", "18.50", 1199, 7, "10500", [
        f"{EXT}/Citroen/Aircross/12973/1769597288445/front-left-side-47.jpg",
        f"{EXT}/Citroen/Aircross/12972/1784261266138/rear-left-view-121.jpg",
        f"{INT}/Citroen/Aircross/12971/1759494907474/dashboard-59.jpg",
        f"{INT}/Citroen/Aircross/12971/1759494907474/steering-wheel-54.jpg"]),
    car("Citroen", "C3", 2025, "Petrol", "Manual", "699000", None, 1199, 5, "9000", [
        f"{EXT}/Citroen/C3/12597/1779267416719/front-left-side-47.jpg",
        f"{EXT}/Citroen/C3/12594/1778151322928/rear-right-side-48.jpg",
        f"{EXT}/Citroen/C3/12594/1778151322928/rear-left-view-121.jpg",
        f"{INT}/Citroen/C3/12597/1778151114580/dashboard-59.jpg",
        f"{INT}/Citroen/C3/12597/1778151114580/steering-wheel-54.jpg"]),
    car("Citroen", "eC3", 2025, "Electric", "Automatic", "1250000", None, None, 5, "7000", [
        f"{EXT}/Citroen/eC3/9111/1785817674581/front-left-side-47.jpg",
        f"{EXT}/Citroen/eC3/9111/1785817674581/rear-left-view-121.jpg"]),

    car("Jeep", "Compass", 2025, "Diesel", "Automatic", "2650000", "17.10", 1956, 5, "22000", [
        f"{EXT}/Jeep/Compass/10938/1772782142501/front-left-side-47.jpg",
        f"{EXT}/Jeep/Compass/10938/1772782142501/rear-left-view-121.jpg",
        f"{INT}/Jeep/Compass/10938/1772782172305/steering-wheel-54.jpg"]),
    car("Jeep", "Meridian", 2025, "Diesel", "Automatic", "3200000", "16.00", 1956, 7, "26000", [
        f"{EXT}/Jeep/Meridian/12764/1778564041407/front-left-side-47.jpg",
        f"{EXT}/Jeep/Meridian/12764/1778564041407/rear-right-side-48.jpg",
        f"{EXT}/Jeep/Meridian/12764/1778564041407/rear-left-view-121.jpg",
        f"{INT}/Jeep/Meridian/13317/1778563810026/dashboard-59.jpg",
        f"{INT}/Jeep/Meridian/13317/1778563810026/steering-wheel-54.jpg"]),
    car("Jeep", "Wrangler", 2025, "Petrol", "Automatic", "6458000", "11.00", 1995, 5, "45000", [
        f"{EXT}/Jeep/Wrangler/9782/1767782355459/front-left-side-47.jpg",
        f"{INT}/Jeep/Wrangler-2024/9782/1680765489408/dashboard-59.jpg",
        f"{INT}/Jeep/Wrangler/11675/1714043153169/steering-wheel-54.jpg"]),

    car("Nissan", "Magnite", 2025, "Petrol", "Automatic", "899000", "19.90", 999, 5, "9000", [
        f"{EXT}/Nissan/Magnite/11793/1760004620755/front-left-side-47.jpg",
        f"{EXT}/Nissan/Magnite/11793/1760004620755/rear-right-side-48.jpg",
        f"{EXT}/Nissan/Magnite/11793/1760004620755/rear-left-view-121.jpg",
        f"{INT}/Nissan/Magnite/11793/1760004175324/dashboard-59.jpg",
        f"{INT}/Nissan/Magnite/11793/1760004175324/steering-wheel-54.jpg"]),
    car("Nissan", "X-Trail", 2024, "Petrol", "Automatic", "4992000", "13.70", 1497, 7, "28000", [
        f"{EXT}/Nissan/X-Trail/3372/1764934756316/front-left-side-47.jpg",
        f"{EXT}/Nissan/X-Trail/3372/1779792708646/rear-right-side-48.jpg",
        f"{INT}/Nissan/X-Trail/3372/1666087576193/dashboard-59.jpg",
        f"{INT}/Nissan/X-Trail/3372/1666087576193/steering-wheel-54.jpg"]),

    car("BYD", "Seal", 2025, "Electric", "Automatic", "4150000", None, None, 5, "12000", [
        f"{EXT}/BYD/Seal/9561/1770881231451/front-left-side-47.jpg",
        f"{EXT}/BYD/Seal/9561/1734775694899/rear-left-view-121.jpg",
        f"{EXT}/BYD/Seal/9561/1734775694899/rear-view-119.jpg",
        f"{INT}/BYD/Seal/9561/1734775752320/dashboard-59.jpg",
        f"{INT}/BYD/Seal/9561/1734775752320/steering-wheel-54.jpg"]),
    car("BYD", "Atto 3", 2025, "Electric", "Automatic", "2499000", None, None, 5, "10000", [
        f"{EXT}/BYD/Atto-3/11837/1768891336368/front-left-side-47.jpg",
        f"{EXT}/BYD/Atto-3/11837/1720614766877/rear-right-side-48.jpg",
        f"{EXT}/BYD/Atto-3/11837/1720614766877/rear-left-view-121.jpg"]),
    car("BYD", "eMAX 7", 2025, "Electric", "Automatic", "2790000", None, None, 7, "11000", [
        f"{EXT}/BYD/eMAX-7/12144/1768891656918/front-left-side-47.jpg",
        f"{EXT}/BYD/eMAX-7/11999/1732163048268/rear-right-side-48.jpg",
        f"{EXT}/BYD/eMAX-7/11999/1732163048268/rear-left-view-121.jpg",
        f"{INT}/BYD/eMAX-7/11999/1732163100855/dashboard-59.jpg",
        f"{INT}/BYD/eMAX-7/11999/1732163100855/steering-wheel-54.jpg"]),
    car("BYD", "Sealion 7", 2025, "Electric", "Automatic", "5290000", None, None, 5, "15000", [
        f"{EXT}/BYD/Sealion-7/12273/1768892259667/front-left-side-47.jpg",
        f"{EXT}/BYD/Sealion-7/12273/1739793527016/rear-right-side-48.jpg",
        f"{EXT}/BYD/Sealion-7/12273/1739793527016/rear-view-119.jpg",
        f"{INT}/BYD/Sealion-7/12273/1739793480946/dashboard-59.jpg",
        f"{INT}/BYD/Sealion-7/12273/1739793480946/steering-wheel-54.jpg"]),

    car("Mercedes-Benz", "GLC", 2025, "Petrol", "Automatic", "7500000", None, 1999, 5, "55000", [
        f"{EXT}/Mercedes-Benz/GLC/9132/1780561369842/front-left-side-47.jpg",
        f"{EXT}/Mercedes-Benz/GLC/9132/1780561369842/rear-right-side-48.jpg",
        f"{EXT}/Mercedes-Benz/GLC/9132/1780561369842/rear-left-view-121.jpg",
        f"{INT}/Mercedes-Benz/GLC/9132/1780561012275/dashboard-59.jpg",
        f"{INT}/Mercedes-Benz/GLC/9132/1780561012275/steering-wheel-54.jpg"]),
    car("Mercedes-Benz", "C-Class", 2025, "Petrol", "Automatic", "5865000", None, None, 5, "48000", [
        f"{EXT}/Mercedes-Benz/C-Class/10858/1774342866770/front-left-side-47.jpg",
        f"{EXT}/Mercedes-Benz/C-Class/10858/1774342626058/rear-right-side-48.jpg",
        f"{EXT}/Mercedes-Benz/C-Class/10858/1774342626058/rear-left-view-121.jpg"]),
    car("Mercedes-Benz", "GLE", 2025, "Diesel", "Automatic", "9614000", None, 1950, 5, "65000", [
        f"{EXT}/Mercedes-Benz/GLE/11332/1763535294500/front-left-side-47.jpg",
        f"{INT}/Mercedes-Benz/GLE/11927/1724843376602/dashboard-59.jpg",
        f"{INT}/Mercedes-Benz/GLE/11927/1724843376602/steering-wheel-54.jpg"]),

    car("BMW", "X1", 2025, "Petrol", "Automatic", "5090000", "20.37", 1499, 5, "38000", [
        f"{EXT}/BMW/X1/10064/1762779713274/front-left-side-47.jpg",
        f"{EXT}/BMW/X1/10064/1774956763610/rear-right-side-48.jpg",
        f"{EXT}/BMW/X1/10064/1774956763610/rear-left-view-121.jpg",
        f"{INT}/BMW/X1/10064/1683261594864/dashboard-59.jpg",
        f"{INT}/BMW/X1/10064/1683261594864/steering-wheel-54.jpg"]),
    car("BMW", "3 Series", 2025, "Diesel", "Automatic", "4690000", None, 1995, 5, "42000", [
        f"{EXT}/BMW/3-Series/10574/1761732994122/front-left-side-47.jpg",
        f"{EXT}/BMW/3-Series/10574/1761732994122/rear-right-side-48.jpg",
        f"{EXT}/BMW/3-Series/10574/1761732994122/rear-left-view-121.jpg",
        f"{INT}/BMW/3-Series/10574/1761734020865/dashboard-59.jpg",
        f"{INT}/BMW/3-Series/10574/1761734020865/steering-wheel-54.jpg"]),
    car("BMW", "X3", 2025, "Diesel", "Automatic", "7250000", "17.86", 1995, 5, "50000", [
        f"{EXT}/BMW/X3/11819/1784195468096/front-left-side-47.jpg",
        f"{EXT}/BMW/X3/11819/1777024426061/rear-left-view-121.jpg",
        f"{INT}/BMW/X3/11819/1777024361633/dashboard-59.jpg",
        f"{INT}/BMW/X3/11819/1777024361633/steering-wheel-54.jpg"]),

    car("Audi", "Q3", 2025, "Petrol", "Automatic", "4367000", "11.91", 1984, 5, "40000", [
        f"{EXT}/Audi/Q3/10554/1784174955579/front-left-side-47.jpg",
        f"{EXT}/Audi/Q3/10554/1784174955579/rear-left-view-121.jpg",
        f"{INT}/Audi/Q3/10554/1784174921139/dashboard-59.jpg"]),
    car("Audi", "Q5", 2025, "Petrol", "Automatic", "6375000", "13.47", 1984, 5, "55000", [
        f"{EXT}/Audi/Q5/10556/1757140951323/front-left-side-47.jpg",
        f"{EXT}/Audi/Q5/10556/1689594416925/rear-right-side-48.jpg",
        f"{EXT}/Audi/Q5/10556/1689594416925/rear-left-view-121.jpg",
        f"{INT}/Audi/Q5/10556/1689594301343/dashboard-59.jpg",
        f"{INT}/Audi/Q5/10556/1689594301343/steering-wheel-54.jpg"]),
    car("Audi", "A4", 2025, "Petrol", "Automatic", "4625000", "17.40", 1984, 5, "40000", [
        f"{EXT}/Audi/A4/10548/1757137106350/front-left-side-47.jpg",
        f"{EXT}/Audi/A4/10548/1732257078935/rear-left-view-121.jpg",
        f"{INT}/Audi/A4/10548/1732257124660/dashboard-59.jpg",
        f"{INT}/Audi/A4/10548/1732257124660/steering-wheel-54.jpg"]),
    car("Audi", "A6", 2025, "Petrol", "Automatic", "6374000", "14.11", 1984, 5, "50000", [
        f"{EXT}/Audi/A6/10551/1757140056684/front-left-side-47.jpg",
        f"{EXT}/Audi/A6/10552/1700631019657/rear-right-side-48.jpg",
        f"{EXT}/Audi/A6/10552/1700631019657/rear-left-view-121.jpg",
        f"{INT}/Audi/A6/10552/1700630964086/dashboard-59.jpg",
        f"{INT}/Audi/A6/10552/1700630964086/steering-wheel-54.jpg"]),

    car("Volvo", "EX30", 2025, "Electric", "Automatic", "4100000", None, None, 5, "9000", [
        f"{EXT}/Volvo/EX30/11539/1755870747156/front-left-side-47.jpg",
        f"{EXT}/Volvo/EX30/11539/1755870747156/rear-right-side-48.jpg",
        f"{EXT}/Volvo/EX30/11539/1755870665833/rear-left-view-121.jpg",
        f"{INT}/Volvo/EX30/11539/1755869504301/dashboard-59.jpg",
        f"{INT}/Volvo/EX30/11539/1755869504301/steering-wheel-54.jpg"]),
    car("Volvo", "XC60", 2025, "Petrol", "Automatic", "6850000", None, None, 5, "42000", [
        f"{EXT}/Volvo/XC60/12772/1754630721419/front-left-side-47.jpg",
        f"{EXT}/Volvo/XC60/12772/1754630721419/rear-right-side-48.jpg",
        f"{EXT}/Volvo/XC60/12772/1754630721419/rear-left-view-121.jpg",
        f"{INT}/Volvo/XC60/12772/1754630872125/dashboard-59.jpg",
        f"{INT}/Volvo/XC60/12772/1754630872125/steering-wheel-54.jpg"]),

    car("Land Rover", "Range Rover Evoque", 2025, "Petrol", "Automatic", "6640000", "12.82", 1997, 5, "55000", [
        f"{EXT}/Land-Rover/Range-Rover-Evoque/12549/1767783202589/front-left-side-47.jpg",
        f"{EXT}/Land-Rover/Range-Rover-Evoque/12549/1745923709605/rear-right-side-48.jpg",
        f"{INT}/Land-Rover/Range-Rover-Evoque/12549/1745923674241/dashboard-59.jpg",
        f"{INT}/Land-Rover/Range-Rover-Evoque/12549/1745923674241/steering-wheel-54.jpg"]),
    car("Land Rover", "Defender", 2025, "Petrol", "Automatic", "12500000", None, 1997, 5, "70000", [
        f"{EXT}/Land-Rover/Defender/9080/1755764417900/front-left-side-47.jpg",
        f"{EXT}/Land-Rover/Defender/9080/1754473172055/rear-right-side-48.jpg",
        f"{EXT}/Land-Rover/Defender/9080/1754473292780/rear-left-view-121.jpg",
        f"{INT}/Land-Rover/Defender/9080/1754473367577/dashboard-59.jpg",
        f"{INT}/Land-Rover/Defender/9080/1754473367577/steering-wheel-54.jpg"]),

    car("Jaguar", "F-Pace", 2025, "Petrol", "Automatic", "7290000", None, 1997, 5, "58000", [
        f"{EXT}/Jaguar/F-Pace/10644/1755774688332/front-left-side-47.jpg"]),

    car("Lexus", "NX", 2025, "Hybrid", "Automatic", "6759000", "17.80", 2487, 5, "20000", [
        f"{EXT}/Lexus/NX/8887/1769081441968/front-left-side-47.jpg",
        f"{EXT}/Lexus/NX/8455/1780317513006/rear-right-side-48.jpg",
        f"{EXT}/Lexus/NX/8455/1780317513006/rear-view-119.jpg",
        f"{INT}/Lexus/NX/8887/1646816084840/dashboard-59.jpg",
        f"{INT}/Lexus/NX/8887/1646816084840/steering-wheel-54.jpg"]),
    car("Lexus", "ES", 2025, "Hybrid", "Automatic", "6610000", None, 2487, 5, "18000", [
        f"{EXT}/Lexus/ES/9398/1769080992566/front-left-side-47.jpg",
        f"{EXT}/Lexus/ES/9399/1665652746848/rear-left-view-121.jpg"]),

    car("Porsche", "Macan", 2025, "Petrol", "Automatic", "8965000", "10.10", 1984, 5, "85000", [
        f"{EXT}/Porsche/Macan/10973/1769058316029/front-left-side-47.jpg",
        f"{EXT}/Porsche/Macan/10973/1752478013186/rear-right-side-48.jpg",
        f"{EXT}/Porsche/Macan/10973/1752478013186/rear-left-view-121.jpg",
        f"{INT}/Porsche/Macan/10973/1752478173856/dashboard-59.jpg",
        f"{INT}/Porsche/Macan/10973/1752478173856/steering-wheel-54.jpg"]),
    car("Porsche", "Cayenne", 2025, "Petrol", "Automatic", "13600000", "10.80", 2995, 5, "110000", [
        f"{EXT}/Porsche/Cayenne/9903/1769058007478/front-left-side-47.jpg",
        f"{EXT}/Porsche/Cayenne-2024/9903/Porsche-Cayenne-2024-/1681882894783/rear-right-side-48.jpg",
        f"{EXT}/Porsche/Cayenne-2024/9903/Porsche-Cayenne-2024-/1681882894783/rear-left-view-121.jpg"]),

    car("MINI", "Cooper S", 2024, "Petrol", "Automatic", "4700000", "16.80", 1998, 4, "35000", [
        f"{EXT}/Mini/Cooper-S/11777/1769679331815/front-left-side-47.jpg",
        f"{EXT}/Mini/Cooper-S-2024/11777/1718087820271/rear-view-119.jpg",
        f"{INT}/Mini/Cooper-S-2024/11777/1718087878647/dashboard-59.jpg",
        f"{INT}/Mini/Cooper-S/12341/1737274497052/steering-wheel-54.jpg"]),
    car("MINI", "Countryman", 2024, "Petrol", "Automatic", "4750000", "14.30", 1499, 5, "38000", [
        f"{EXT}/Mini/Countryman/12992/1760438648158/front-left-side-47.jpg",
        f"{EXT}/Mini/Countryman/12992/1760438648158/rear-right-side-48.jpg",
        f"{EXT}/Mini/Countryman/12992/1760438648158/rear-left-view-121.jpg",
        f"{INT}/Mini/Countryman/12992/1760437843299/dashboard-59.jpg"]),

    # ==================== More models for brands already in the dataset ====================
    car("Maruti Suzuki", "e Vitara", 2025, "Electric", "Automatic", "1699000", None, None, 5, "7500", [
        f"{EXT}/Maruti/e-Vitara/13326/1771560398854/front-left-side-47.jpg",
        f"{EXT}/Maruti/e-Vitara/13326/1771560398854/rear-right-side-48.jpg",
        f"{EXT}/Maruti/e-Vitara/13326/1771560398854/rear-left-view-121.jpg",
        f"{INT}/Maruti/e-Vitara/13326/1771560569551/dashboard-59.jpg",
        f"{INT}/Maruti/e-Vitara/13326/1771560569551/steering-wheel-54.jpg"]),
    car("Hyundai", "Creta Electric", 2025, "Electric", "Automatic", "1803000", None, None, 5, "8500", [
        f"{EXT}/Hyundai/Creta-Electric/11523/1763989947110/front-left-side-47.jpg",
        f"{EXT}/Hyundai/Creta-Electric/11523/1763990398940/rear-right-side-48.jpg",
        f"{EXT}/Hyundai/Creta-Electric/11523/1763990398940/rear-left-view-121.jpg",
        f"{INT}/Hyundai/Creta-Electric/11523/1763990030613/dashboard-59.jpg",
        f"{INT}/Hyundai/Creta-Electric/11523/1763990030613/steering-wheel-54.jpg"]),
    car("Tata Motors", "Sierra", 2025, "Petrol", "Automatic", "1500000", "17.00", 1497, 5, "14000", [
        f"{EXT}/Tata/Sierra/12271/1765181428462/front-left-side-47.jpg",
        f"{EXT}/Tata/Sierra/12271/1765181428462/rear-right-side-48.jpg",
        f"{EXT}/Tata/Sierra/12271/1765181428462/rear-left-view-121.jpg",
        f"{INT}/Tata/Sierra/12271/1765181599077/dashboard-59.jpg",
        f"{INT}/Tata/Sierra/12271/1765181599077/steering-wheel-54.jpg"]),
    car("Mahindra", "BE 6", 2025, "Electric", "Automatic", "1890000", None, None, 5, "9500", [
        f"{EXT}/Mahindra/BE-6/13803/1786778466367/front-left-side-47.jpg",
        f"{INT}/Mahindra/BE-6/13803/1786778488120/dashboard-59.jpg",
        f"{INT}/Mahindra/BE-6/13803/1786778488120/steering-wheel-54.jpg"]),
    car("Kia", "Syros", 2025, "Petrol", "Automatic", "1200000", "17.68", 998, 5, "12500", [
        f"{EXT}/Kia/Syros/13504/1776683248946/front-left-side-47.jpg",
        f"{EXT}/Kia/Syros/12244/1776690689712/rear-view-119.jpg",
        f"{INT}/Kia/Syros/12244/1776690742208/dashboard-59.jpg",
        f"{INT}/Kia/Syros/12244/1776690742208/steering-wheel-54.jpg"]),
    car("Toyota", "Urban Cruiser Taisor", 2025, "Petrol", "Automatic", "949000", "19.86", 998, 5, "10000", [
        f"{EXT}/Toyota/Taisor/11645/1777096329164/front-left-side-47.jpg",
        f"{EXT}/Toyota/Urban-Cruiser-Taisor/11639/1712131241368/rear-left-view-121.jpg",
        f"{INT}/Toyota/Urban-Cruiser-Taisor/11639/1712131381261/dashboard-59.jpg",
        f"{INT}/Toyota/Urban-Cruiser-Taisor/11639/1712131381261/steering-wheel-54.jpg"]),
    car("Honda", "Elevate", 2025, "Petrol", "Automatic", "1350000", "16.92", 1498, 5, "13500", [
        f"{EXT}/Honda/Elevate/12099/1758802336858/front-left-side-47.jpg",
        f"{EXT}/Honda/Elevate/12099/1758790837363/rear-right-side-48.jpg",
        f"{EXT}/Honda/Elevate/12099/1758790837363/rear-left-view-121.jpg",
        f"{INT}/Honda/Elevate/12099/1758792263018/dashboard-59.jpg",
        f"{INT}/Honda/Elevate/12099/1758792263018/steering-wheel-54.jpg"]),
    car("Volkswagen", "Tayron", 2025, "Petrol", "Automatic", "4199000", "13.00", 1984, 7, "30000", [
        f"{EXT}/Volkswagen/Tayron/12605/1784192866768/front-left-side-47.jpg",
        f"{EXT}/Volkswagen/Tayron-R-Line/12605/1771483943023/rear-right-side-48.jpg",
        f"{EXT}/Volkswagen/Tayron-R-Line/12605/1771483943023/rear-left-view-121.jpg",
        f"{INT}/Volkswagen/Tayron-R-Line/12605/1771484073298/dashboard-59.jpg",
        f"{INT}/Volkswagen/Tayron-R-Line/12605/1771484073298/steering-wheel-54.jpg"]),
    car("Renault", "Duster", 2025, "Petrol", "Automatic", "1249000", "17.75", 1330, 5, "13000", [
        f"{EXT}/Renault/Duster/9674/1774331005907/front-left-side-47.jpg",
        f"{EXT}/Renault/Duster/13373/1782121675790/rear-right-side-48.jpg",
        f"{EXT}/Renault/Duster/13372/1782121747521/rear-left-view-121.jpg",
        f"{INT}/Renault/Duster/13371/1782121452079/dashboard-59.jpg",
        f"{INT}/Renault/Duster/13371/1782121452079/steering-wheel-54.jpg"]),
    car("Skoda", "Kylaq", 2025, "Petrol", "Automatic", "999000", "19.05", 999, 5, "11500", [
        f"{EXT}/Skoda/Kylaq/11528/1775034823247/front-left-side-47.jpg",
        f"{EXT}/Skoda/Kylaq/11528/1775034610923/rear-right-side-48.jpg",
        f"{EXT}/Skoda/Kylaq/11528/1775034610923/rear-left-view-121.jpg",
        f"{INT}/Skoda/Kylaq/11528/1775033984151/dashboard-59.jpg",
        f"{INT}/Skoda/Kylaq/11528/1775033984151/steering-wheel-54.jpg"]),
]


def run():
    db = SessionLocal()
    try:
        # This schema's `id` columns are plain INT primary keys with no
        # IDENTITY property (every existing row was inserted with an
        # explicit id) - so we assign the next id ourselves and use raw
        # SQL inserts, sidestepping SQLAlchemy's MSSQL dialect trying to
        # (incorrectly) issue SET IDENTITY_INSERT for a non-identity column.
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
                "created_at": "2026-08-15 00:00:00",
            })
            added += 1
            next_car_id += 1

        db.commit()
        print(f"Done. Added {added} cars, skipped {skipped} already present.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
