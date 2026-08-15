from decimal import Decimal
from app.schemas.car import RecommendRequest, RecommendResult, RecommendCarItem
from app.services.body_type import body_type_of

_CITY_FUELS = {"CNG", "Electric"}
_HIGHWAY_FUELS = {"Diesel"}


def score_car(car, req: RecommendRequest) -> tuple[int, list[str]]:
    score = 0
    reasons = []

    # ── Budget ────────────────────────────────────────────────────────────────
    if car.price is not None and car.price <= req.budget:
        utilization = float(car.price) / float(req.budget)
        if utilization >= 0.80:
            score += 40
            reasons.append("Best fit for your budget")
        elif utilization >= 0.60:
            score += 30
            reasons.append("Within your budget")
        elif utilization >= 0.40:
            score += 20
            reasons.append("Within your budget")
        else:
            score += 10
            reasons.append("Within your budget")

    # ── Explicit fuel preference ───────────────────────────────────────────────
    if req.fuel_type and car.fuel_type == req.fuel_type:
        score += 20
        reasons.append(f"Runs on {car.fuel_type}")

    # ── Seats ────────────────────────────────────────────────────────────────
    if req.seats and car.seats is not None and car.seats >= req.seats:
        score += 15
        reasons.append(f"Seats {car.seats} people")

    # ── Mileage baseline ─────────────────────────────────────────────────────
    if car.mileage is not None and car.mileage >= Decimal("15"):
        score += 10
        reasons.append(f"{car.mileage} km/l efficiency")

    # ── Service cost baseline ────────────────────────────────────────────────
    if car.service_cost is not None and car.service_cost <= Decimal("20000"):
        score += 15
        reasons.append(f"₹{int(car.service_cost):,}/yr service cost")

    # ── Explicit transmission preference ──────────────────────────────────────
    if req.transmission and car.transmission == req.transmission:
        score += 10
        reasons.append(f"{car.transmission} transmission")

    # ── Brand preference ────────────────────────────────────────────────────
    if req.brands and car.brand is not None and car.brand.name in req.brands:
        score += 15
        reasons.append(f"{car.brand.name} — one of your preferred brands")

    # ── Body type preference ────────────────────────────────────────────────
    if req.body_type and body_type_of(car.model) == req.body_type:
        score += 15
        reasons.append(f"{req.body_type} — matches your preference")

    # ── Priority bonus ────────────────────────────────────────────────────────
    if req.priority == "efficiency":
        if car.mileage is not None and car.mileage >= Decimal("18"):
            score += 10
            reasons.append("Excellent fuel efficiency")
    elif req.priority == "low_maintenance":
        if car.service_cost is not None and car.service_cost <= Decimal("15000"):
            score += 10
            reasons.append("Very low annual upkeep")

    # ── Use case ──────────────────────────────────────────────────────────────
    if req.use_case == "city":
        if car.fuel_type in _CITY_FUELS:
            score += 15
            reasons.append(f"Great for city ({car.fuel_type})")
        if car.mileage is not None and car.mileage >= Decimal("15"):
            score += 10
            reasons.append("Efficient in stop-start traffic")

    elif req.use_case == "highway":
        if car.fuel_type in _HIGHWAY_FUELS:
            score += 15
            reasons.append("Diesel — ideal for long drives")
        if car.transmission == "Automatic":
            score += 10
            reasons.append("Automatic — comfortable on highways")

    elif req.use_case == "family":
        if car.seats is not None and car.seats >= 6:
            score += 20
            reasons.append(f"Spacious {car.seats}-seater")
        elif car.seats is not None and car.seats >= 5:
            score += 10
            reasons.append(f"{car.seats}-seater fits a family")

    elif req.use_case == "first_car":
        if car.transmission == "Automatic":
            score += 10
            reasons.append("Automatic — easy for new drivers")
        if car.service_cost is not None and car.service_cost <= Decimal("15000"):
            score += 10
            reasons.append("Low upkeep cost")

    # ── Year preference ───────────────────────────────────────────────────────
    if req.year_preference and car.year is not None:
        cutoff = int(req.year_preference)
        if car.year >= cutoff:
            score += 15
            reasons.append(f"Recent model ({car.year})")

    return score, reasons


def recommend_cars(cars, req: RecommendRequest) -> list[RecommendResult]:
    results = []
    for car in cars:
        s, reasons = score_car(car, req)
        if s > 0:
            results.append(
                RecommendResult(
                    car=RecommendCarItem.model_validate(car),
                    score=s,
                    reasons=reasons,
                )
            )
    results.sort(key=lambda x: x.score, reverse=True)
    return results[: req.top_n]
