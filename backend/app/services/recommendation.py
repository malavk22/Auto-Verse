from decimal import Decimal
from app.schemas.car import RecommendRequest


def score_car(car, req: RecommendRequest) -> int:
    score = 0

    if car.price is not None and car.price <= req.budget:
        score += 40

    if req.fuel_type and car.fuel_type == req.fuel_type:
        score += 20

    if req.seats and car.seats is not None and car.seats >= req.seats:
        score += 15

    if car.mileage is not None and car.mileage >= Decimal("15"):
        score += 10

    # Reward lower service cost
    if car.service_cost is not None and car.service_cost <= Decimal("20000"):
        score += 15

    return score
