from decimal import Decimal
from app.schemas.car import RecommendRequest, RecommendResult, RecommendCarItem
from app.services.body_type import body_type_of

_CITY_FUELS = {"CNG", "Electric"}
_HIGHWAY_FUELS = {"Diesel"}


def score_car(car, req: RecommendRequest) -> tuple[int, list[str]]:
    score = 0
    # Keyed by theme, not a plain list - several bonuses below can fire for
    # the same underlying signal (e.g. mileage), so a later, more specific
    # bonus's text replaces the earlier generic one instead of stacking.
    reasons = {}

    # ── Budget ────────────────────────────────────────────────────────────────
    if car.price is not None and car.price <= req.budget:
        utilization = float(car.price) / float(req.budget)
        if utilization >= 0.80:
            score += 40
            reasons["budget"] = "Best fit for your budget"
        elif utilization >= 0.60:
            score += 30
            reasons["budget"] = "Within your budget"
        elif utilization >= 0.40:
            score += 20
            reasons["budget"] = "Within your budget"
        else:
            score += 10
            reasons["budget"] = "Within your budget"

    # ── Explicit fuel preference ───────────────────────────────────────────────
    if req.fuel_type and car.fuel_type == req.fuel_type:
        score += 20
        reasons["fuel"] = f"Runs on {car.fuel_type}"

    # ── Seats ────────────────────────────────────────────────────────────────
    if req.seats and car.seats is not None and car.seats >= req.seats:
        score += 15
        reasons["seats"] = f"Seats {car.seats} people"

    # ── Mileage baseline ─────────────────────────────────────────────────────
    if car.mileage is not None and car.mileage >= Decimal("15"):
        score += 10
        reasons["efficiency"] = f"{car.mileage} km/l efficiency"

    # ── Service cost baseline ────────────────────────────────────────────────
    if car.service_cost is not None and car.service_cost <= Decimal("20000"):
        score += 15
        reasons["maintenance"] = f"₹{int(car.service_cost):,}/yr service cost"

    # ── Explicit transmission preference ──────────────────────────────────────
    if req.transmission and car.transmission == req.transmission:
        score += 10
        reasons["transmission"] = f"{car.transmission} transmission"

    # ── Brand preference ────────────────────────────────────────────────────
    if req.brands and car.brand is not None and car.brand.name in req.brands:
        score += 15
        reasons["brand"] = f"{car.brand.name} — one of your preferred brands"

    # ── Body type preference ────────────────────────────────────────────────
    if req.body_type and body_type_of(car.model) == req.body_type:
        score += 15
        reasons["body_type"] = f"{req.body_type} — matches your preference"

    # ── Priority bonus ────────────────────────────────────────────────────────
    if req.priority == "efficiency":
        if car.mileage is not None and car.mileage >= Decimal("18"):
            score += 10
            reasons["efficiency"] = "Excellent fuel efficiency"
    elif req.priority == "low_maintenance":
        if car.service_cost is not None and car.service_cost <= Decimal("15000"):
            score += 10
            reasons["maintenance"] = "Very low annual upkeep"

    # ── Use case ──────────────────────────────────────────────────────────────
    if req.use_case == "city":
        if car.fuel_type in _CITY_FUELS:
            score += 15
            reasons["use_case"] = f"Great for city ({car.fuel_type})"
        if car.mileage is not None and car.mileage >= Decimal("15"):
            score += 10
            reasons["efficiency"] = "Efficient in stop-start traffic"

    elif req.use_case == "highway":
        if car.fuel_type in _HIGHWAY_FUELS:
            score += 15
            reasons["use_case"] = "Diesel — ideal for long drives"
        if car.transmission == "Automatic":
            score += 10
            reasons["transmission"] = "Automatic — comfortable on highways"

    elif req.use_case == "family":
        if car.seats is not None and car.seats >= 6:
            score += 20
            reasons["seats"] = f"Spacious {car.seats}-seater"
        elif car.seats is not None and car.seats >= 5:
            score += 10
            reasons["seats"] = f"{car.seats}-seater fits a family"

    elif req.use_case == "first_car":
        if car.transmission == "Automatic":
            score += 10
            reasons["transmission"] = "Automatic — easy for new drivers"
        if car.service_cost is not None and car.service_cost <= Decimal("15000"):
            score += 10
            reasons["maintenance"] = "Low upkeep cost"

    # ── Year preference ───────────────────────────────────────────────────────
    if req.year_preference and car.year is not None:
        cutoff = int(req.year_preference)
        if car.year >= cutoff:
            score += 15
            reasons["year"] = f"Recent model ({car.year})"

    return score, list(reasons.values())


def _tiebreak(car, req: RecommendRequest) -> float:
    # The main score moves in coarse chunks, so unrelated cars often tie on
    # the exact same integer total. This blends in continuous detail (exact
    # budget fit, mileage, service cost) capped well under 1.0, so it can
    # only break ties, never outweigh a real score difference.
    t = 0.0
    if car.price is not None and req.budget:
        t += min(float(car.price) / float(req.budget), 1.0) * 0.3
    if car.mileage is not None:
        t += min(float(car.mileage) / 30, 1.0) * 0.2
    if car.service_cost is not None and car.service_cost > 0:
        t += min(10000 / float(car.service_cost), 1.0) * 0.1
    return t


def recommend_cars(cars, req: RecommendRequest) -> list[RecommendResult]:
    # `cars` isn't deduped by model (unlike Browse Cars) - a popular model
    # can have a dozen+ near-identical year variants, which would otherwise
    # fill multiple slots with the same car. Keep only the best-scoring
    # variant per (brand, model), newest year wins ties.
    best_per_model = {}
    for car in cars:
        s, reasons = score_car(car, req)
        if s <= 0:
            continue
        key = (car.brand.name, car.model)
        existing = best_per_model.get(key)
        if existing is None or s > existing[0] or (s == existing[0] and car.year > existing[1].year):
            best_per_model[key] = (s, car, reasons)

    scored = [
        (s + _tiebreak(car, req), car, reasons)
        for s, car, reasons in best_per_model.values()
    ]
    scored.sort(key=lambda x: x[0], reverse=True)

    return [
        RecommendResult(car=RecommendCarItem.model_validate(car), score=display_score, reasons=reasons)
        for display_score, car, reasons in scored[: req.top_n]
    ]
