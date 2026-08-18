from decimal import Decimal

from app.schemas.car import RecommendRequest
from app.services.recommendation import recommend_cars, score_car
from tests.conftest import make_car


def _req(**kwargs):
    kwargs.setdefault("budget", Decimal("1000000"))
    return RecommendRequest(**kwargs)


def test_budget_utilization_tiers_score_higher_the_closer_to_budget():
    req = _req(budget=Decimal("1000000"))

    best_fit = make_car(price=Decimal("900000"))    # 90% of budget
    within = make_car(price=Decimal("700000"))       # 70%
    low_util = make_car(price=Decimal("200000"))     # 20%
    # over budget, and no other baseline bonus applies either (low mileage, high service cost)
    over_budget = make_car(price=Decimal("1200000"), mileage=Decimal("10"), service_cost=Decimal("25000"))

    score_best, reasons_best = score_car(best_fit, req)
    score_within, _ = score_car(within, req)
    score_low, _ = score_car(low_util, req)
    score_over, _ = score_car(over_budget, req)

    assert score_best > score_within > score_low
    assert "Best fit for your budget" in reasons_best
    assert score_over == 0  # priced above budget, and matches nothing else


def test_explicit_preferences_add_matching_bonuses():
    req = _req(fuel_type="Diesel", seats=5, transmission="Automatic")
    car = make_car(price=Decimal("500000"), fuel_type="Diesel", seats=5, transmission="Automatic")

    score, reasons = score_car(car, req)

    assert any("Diesel" in r for r in reasons)
    assert any("Seats 5" in r for r in reasons)
    assert any("Automatic" in r for r in reasons)


def test_priority_efficiency_rewards_high_mileage():
    req = _req(priority="efficiency")
    efficient = make_car(price=Decimal("500000"), mileage=Decimal("22"))
    thirsty = make_car(price=Decimal("500000"), mileage=Decimal("10"))

    score_efficient, reasons = score_car(efficient, req)
    score_thirsty, _ = score_car(thirsty, req)

    assert score_efficient > score_thirsty
    assert "Excellent fuel efficiency" in reasons


def test_use_case_family_prefers_more_seats():
    req = _req(use_case="family")
    seven_seater = make_car(price=Decimal("500000"), seats=7)
    five_seater = make_car(price=Decimal("500000"), seats=5)
    two_seater = make_car(price=Decimal("500000"), seats=2)

    score_7, reasons_7 = score_car(seven_seater, req)
    score_5, _ = score_car(five_seater, req)
    score_2, _ = score_car(two_seater, req)

    assert score_7 > score_5 > score_2
    assert any("Spacious" in r for r in reasons_7)


def test_year_preference_rewards_recent_models():
    req = _req(year_preference="2022")
    recent = make_car(price=Decimal("500000"), year=2023)
    older = make_car(price=Decimal("500000"), year=2019)

    score_recent, reasons = score_car(recent, req)
    score_older, _ = score_car(older, req)

    assert score_recent > score_older
    assert any("Recent model" in r for r in reasons)


def test_brand_preference_adds_bonus_and_reason():
    req = _req(brands=["Honda", "Toyota"])
    preferred = make_car(price=Decimal("500000"), brand_name="Honda")
    other = make_car(price=Decimal("500000"), brand_name="Mahindra")

    score_preferred, reasons = score_car(preferred, req)
    score_other, _ = score_car(other, req)

    assert score_preferred > score_other
    assert any("Honda" in r and "preferred brand" in r for r in reasons)


def test_body_type_preference_matches_by_model():
    req = _req(body_type="SUV")
    suv = make_car(price=Decimal("500000"), model="Creta")       # classified SUV
    hatchback = make_car(price=Decimal("500000"), model="Swift")  # classified Hatchback

    score_suv, reasons = score_car(suv, req)
    score_hatch, _ = score_car(hatchback, req)

    assert score_suv > score_hatch
    assert any("SUV" in r and "matches your preference" in r for r in reasons)


def test_recommend_cars_sorts_descending_and_respects_top_n():
    req = _req(budget=Decimal("1000000"), fuel_type="Petrol", top_n=2)
    cars = [
        make_car(id=1, price=Decimal("950000"), fuel_type="Petrol"),   # high budget-fit + fuel match
        make_car(id=2, price=Decimal("100000"), fuel_type="Diesel"),   # low budget-fit, no fuel match
        make_car(id=3, price=Decimal("800000"), fuel_type="Petrol"),   # mid budget-fit + fuel match
        make_car(  # over budget, and no baseline bonus applies either -> scores 0, excluded
            id=4, price=Decimal("2000000"), fuel_type="Diesel",
            mileage=Decimal("10"), service_cost=Decimal("25000"),
        ),
    ]

    results = recommend_cars(cars, req)

    assert len(results) == 2  # top_n enforced
    assert [r.car.id for r in results] == [1, 3]  # sorted by score, descending
    assert all(r.score > 0 for r in results)
