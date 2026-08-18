from decimal import Decimal

from app.services.ownership_cost import calculate_ownership
from tests.conftest import make_car


def test_ownership_cost_breakdown_for_good_condition():
    car = make_car(price=Decimal("1000000"), mileage=Decimal("20"), service_cost=Decimal("15000"))

    result = calculate_ownership(car, years=5, annual_km=15000, fuel_price=Decimal("100"))

    assert result["annual_fuel_cost"] == Decimal("75000.00")     # (15000/20) * 100
    assert result["annual_insurance"] == Decimal("25000.00")     # 2.5% of price
    assert result["annual_maintenance"] == Decimal("15000.00")   # car.service_cost
    assert result["standard_resale_value"] == Decimal("500000.00")  # IRDAI 50% retained at year 5
    assert result["total_depreciation"] == Decimal("500000.00")
    assert result["total_ownership_cost"] == Decimal("1075000.00")
    assert result["cost_per_year"] == Decimal("215000.00")
    assert result["condition_multiplier"] == Decimal("1.0000")


def test_poor_condition_and_accident_history_reduce_resale_value():
    car = make_car(price=Decimal("1000000"))

    good = calculate_ownership(car, years=5, annual_km=15000, fuel_price=Decimal("100"))
    poor = calculate_ownership(
        car, years=5, annual_km=15000, fuel_price=Decimal("100"),
        condition="poor", accident_history=True,
    )

    # 0.70 (poor) * 0.85 (accident) = 0.595
    assert poor["condition_multiplier"] == Decimal("0.5950")
    assert poor["adjusted_resale_value"] < good["adjusted_resale_value"]
    assert poor["adjusted_resale_value"] == Decimal("297500.00")


def test_missing_service_cost_falls_back_to_default_maintenance():
    car = make_car(service_cost=None)
    result = calculate_ownership(car, years=3, annual_km=10000, fuel_price=Decimal("100"))
    assert result["annual_maintenance"] == Decimal("10000")


def test_zero_years_does_not_divide_by_zero():
    car = make_car()
    result = calculate_ownership(car, years=0, annual_km=15000, fuel_price=Decimal("100"))
    assert result["cost_per_year"] == Decimal("0")
    assert result["cost_per_km"] == Decimal("0")
