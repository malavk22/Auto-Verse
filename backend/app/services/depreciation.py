from decimal import Decimal

# Standard Indian market depreciation schedule (IRDAI-aligned)
DEPRECIATION_RATES = [
    (0, 100),
    (1, 85),
    (2, 75),
    (3, 65),
    (4, 55),
    (5, 50),
    (6, 45),
    (7, 40),
    (8, 35),
]


def calculate_depreciation(car) -> dict:
    price = Decimal(str(car.price)) if car.price else Decimal("0")
    schedule = [
        {
            "year": year,
            "percentage": pct,
            "value": (price * Decimal(str(pct)) / Decimal("100")).quantize(Decimal("0.01")),
        }
        for year, pct in DEPRECIATION_RATES
    ]
    return {
        "car_id": car.id,
        "brand": car.brand.name,
        "model": car.model,
        "purchase_price": price,
        "schedule": schedule,
    }
