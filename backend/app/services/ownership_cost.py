from decimal import Decimal


def calculate_ownership(car, years: int, annual_km: int, fuel_price: Decimal) -> dict:
    price = Decimal(str(car.price)) if car.price else Decimal("0")
    mileage = Decimal(str(car.mileage)) if car.mileage else Decimal("15")

    annual_fuel = (Decimal(str(annual_km)) / mileage) * fuel_price
    annual_insurance = price * Decimal("0.025")
    annual_maintenance = Decimal(str(car.service_cost)) if car.service_cost else Decimal("10000")

    # Depreciation: 15% year 1, 10% each subsequent year
    dep_year1 = price * Decimal("0.15")
    dep_subsequent = price * Decimal("0.10") * (years - 1) if years > 1 else Decimal("0")
    total_depreciation = dep_year1 + dep_subsequent

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
    }
