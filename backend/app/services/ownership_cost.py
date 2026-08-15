from decimal import Decimal

CONDITION_MULTIPLIERS = {
    "excellent": Decimal("1.05"),
    "good":      Decimal("1.00"),
    "fair":      Decimal("0.85"),
    "poor":      Decimal("0.70"),
    "damaged":   Decimal("0.50"),
}

# Years 0-5 match the published IRDAI motor own-damage depreciation schedule
# (retained value = 100 - depreciation%). IRDAI does not define rates beyond
# year 5 ("as agreed between insurer and insured"), so years 6-10 continue
# the same -5%/year slope as an estimate, not an official figure.
IRDAI_RATES = {0: 100, 1: 85, 2: 80, 3: 70, 4: 60, 5: 50, 6: 45, 7: 40, 8: 35, 9: 30, 10: 25}


def _condition_multiplier(condition, accident_history, multiple_owners, no_service_records):
    m = CONDITION_MULTIPLIERS.get(condition, Decimal("1.00"))
    if accident_history:
        m *= Decimal("0.85")
    if multiple_owners:
        m *= Decimal("0.95")
    if no_service_records:
        m *= Decimal("0.92")
    return m


def calculate_ownership(
    car, years: int, annual_km: int, fuel_price: Decimal,
    condition: str = "good",
    accident_history: bool = False,
    multiple_owners: bool = False,
    no_service_records: bool = False,
) -> dict:
    price = Decimal(str(car.price)) if car.price else Decimal("0")
    mileage = Decimal(str(car.mileage)) if car.mileage else Decimal("15")

    annual_fuel = (Decimal(str(annual_km)) / mileage) * fuel_price
    annual_insurance = price * Decimal("0.025")
    annual_maintenance = Decimal(str(car.service_cost)) if car.service_cost else Decimal("10000")

    # Depreciation via IRDAI retained-value table (avoids overflow beyond year 8)
    cond_mult = _condition_multiplier(condition, accident_history, multiple_owners, no_service_records)
    yr_key = min(years, 10)
    irdai_pct = Decimal(str(IRDAI_RATES.get(yr_key, 25))) / Decimal("100")
    standard_resale = price * irdai_pct
    adjusted_resale = standard_resale * cond_mult
    total_depreciation = price - standard_resale

    total_ownership = (annual_fuel + annual_insurance + annual_maintenance) * years + total_depreciation
    cost_per_year = total_ownership / years if years else Decimal("0")
    cost_per_km = total_ownership / (Decimal(str(annual_km)) * years) if annual_km and years else Decimal("0")

    return {
        "car_id": car.id,
        "brand": car.brand.name,
        "model": car.model,
        "ex_showroom_price": price,
        "annual_fuel_cost": annual_fuel.quantize(Decimal("0.01")),
        "annual_insurance": annual_insurance.quantize(Decimal("0.01")),
        "annual_maintenance": annual_maintenance.quantize(Decimal("0.01")),
        "total_depreciation": total_depreciation.quantize(Decimal("0.01")),
        "total_ownership_cost": total_ownership.quantize(Decimal("0.01")),
        "cost_per_year": cost_per_year.quantize(Decimal("0.01")),
        "cost_per_km": cost_per_km.quantize(Decimal("0.01")),
        "condition": condition,
        "condition_multiplier": cond_mult.quantize(Decimal("0.0001")),
        "standard_resale_value": standard_resale.quantize(Decimal("0.01")),
        "adjusted_resale_value": adjusted_resale.quantize(Decimal("0.01")),
    }
