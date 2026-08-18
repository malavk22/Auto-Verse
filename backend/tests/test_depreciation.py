from decimal import Decimal

from app.services.depreciation import calculate_depreciation
from tests.conftest import make_car


def test_schedule_follows_irdai_retained_value_table():
    car = make_car(price=Decimal("1000000"))
    result = calculate_depreciation(car, condition="good")

    by_year = {row["year"]: row for row in result["schedule"]}
    assert by_year[0]["value"] == Decimal("1000000.00")   # 100% at purchase
    assert by_year[1]["value"] == Decimal("850000.00")    # 85% after year 1 (IRDAI: 15% dep)
    assert by_year[2]["value"] == Decimal("800000.00")    # 80% after year 2 (IRDAI: 20% dep)
    assert by_year[3]["value"] == Decimal("700000.00")    # 70% after year 3 (IRDAI: 30% dep)
    assert by_year[4]["value"] == Decimal("600000.00")    # 60% after year 4 (IRDAI: 40% dep)
    assert by_year[5]["value"] == Decimal("500000.00")    # 50% after year 5 (IRDAI: 50% dep)
    assert by_year[10]["value"] == Decimal("250000.00")   # 25% after year 10 (estimated, beyond IRDAI's published range)
    assert result["condition_multiplier"] == Decimal("1.0000")


def test_all_condition_deductions_compound():
    car = make_car(price=Decimal("1000000"))
    result = calculate_depreciation(
        car, condition="damaged",
        accident_history=True, multiple_owners=True, no_service_records=True,
    )
    # 0.50 (damaged) * 0.85 (accident) * 0.95 (multi-owner) * 0.92 (no service)
    assert result["condition_multiplier"] == Decimal("0.3714")

    by_year = {row["year"]: row for row in result["schedule"]}
    # adjusted value is always <= the standard (unadjusted) value under a penalty
    for row in result["schedule"]:
        assert row["adjusted_value"] <= row["value"]
    assert by_year[1]["adjusted_value"] == Decimal("315732.50")


def test_unknown_condition_falls_back_to_no_adjustment():
    car = make_car(price=Decimal("1000000"))
    result = calculate_depreciation(car, condition="mint")  # not a real key
    assert result["condition_multiplier"] == Decimal("1.0000")
