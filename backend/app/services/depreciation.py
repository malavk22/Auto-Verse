from decimal import Decimal

DEPRECIATION_RATES = [
    (0, 100), (1, 85), (2, 75), (3, 65), (4, 55),
    (5, 50),  (6, 45), (7, 40), (8, 35), (9, 30), (10, 25),
]

CONDITION_MULTIPLIERS = {
    "excellent": Decimal("1.05"),
    "good":      Decimal("1.00"),
    "fair":      Decimal("0.85"),
    "poor":      Decimal("0.70"),
    "damaged":   Decimal("0.50"),
}


def _condition_multiplier(condition, accident_history, multiple_owners, no_service_records):
    m = CONDITION_MULTIPLIERS.get(condition, Decimal("1.00"))
    if accident_history:
        m *= Decimal("0.85")
    if multiple_owners:
        m *= Decimal("0.95")
    if no_service_records:
        m *= Decimal("0.92")
    return m


def calculate_depreciation(
    car,
    condition: str = "good",
    accident_history: bool = False,
    multiple_owners: bool = False,
    no_service_records: bool = False,
) -> dict:
    price = Decimal(str(car.price)) if car.price else Decimal("0")
    cond_mult = _condition_multiplier(condition, accident_history, multiple_owners, no_service_records)

    schedule = [
        {
            "year": year,
            "percentage": pct,
            "value": (price * Decimal(str(pct)) / Decimal("100")).quantize(Decimal("0.01")),
            "adjusted_value": (price * Decimal(str(pct)) / Decimal("100") * cond_mult).quantize(Decimal("0.01")),
        }
        for year, pct in DEPRECIATION_RATES
    ]

    return {
        "car_id": car.id,
        "brand": car.brand.name,
        "model": car.model,
        "purchase_price": price,
        "condition_multiplier": cond_mult.quantize(Decimal("0.0001")),
        "schedule": schedule,
    }
