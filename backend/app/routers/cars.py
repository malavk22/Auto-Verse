from __future__ import annotations

from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.car import Car, Brand
from sqlalchemy import or_
from app.query_helpers import with_brand, with_brand_light
from app.schemas.car import CarOut, CarListItem, PaginatedCars, FilterOptions, AutocompleteItem

router = APIRouter(prefix="/cars", tags=["cars"])


@router.get("/filters/options", response_model=FilterOptions)
def get_filter_options(db: Session = Depends(get_db)):
    # Not cached: the dataset only changes via offline seed scripts (there's
    # no admin "add car" endpoint), so a process-lifetime cache here has no
    # way to ever invalidate itself - it previously went stale the moment
    # any car/brand was added while the server kept running. These are a
    # handful of indexed DISTINCT/MIN/MAX scans, cheap enough to run per
    # request at this dataset size.
    brands = [r[0] for r in db.query(distinct(Brand.name)).order_by(Brand.name).all()]
    fuels = [r[0] for r in db.query(distinct(Car.fuel_type)).filter(Car.fuel_type.isnot(None)).order_by(Car.fuel_type).all()]
    transmissions = [r[0] for r in db.query(distinct(Car.transmission)).filter(Car.transmission.isnot(None)).order_by(Car.transmission).all()]
    seats = sorted([r[0] for r in db.query(distinct(Car.seats)).filter(Car.seats.isnot(None)).all()])
    min_price = db.query(func.min(Car.price)).scalar()
    max_price = db.query(func.max(Car.price)).scalar()

    return FilterOptions(
        brands=brands,
        fuel_types=fuels,
        transmissions=transmissions,
        seat_options=seats,
        min_price=min_price,
        max_price=max_price,
    )


@router.get("/brands", response_model=list[str])
def get_brands(db: Session = Depends(get_db)):
    return [r[0] for r in db.query(distinct(Brand.name)).order_by(Brand.name).all()]


@router.get("/compare", response_model=list[CarOut])
def compare_cars(ids: str = Query(..., description="Comma-separated car IDs, max 3"), db: Session = Depends(get_db)):
    id_list = [int(i) for i in ids.split(",") if i.strip().isdigit()][:3]
    if not id_list:
        raise HTTPException(status_code=400, detail="Provide at least one valid car ID")
    cars = (
        with_brand(db.query(Car))
        .filter(Car.id.in_(id_list), Car.is_active == 1)
        .all()
    )
    for car in cars:
        car.compare_count += 1
    db.commit()
    for car in cars:
        db.refresh(car)
    return cars


@router.get("/autocomplete", response_model=list[AutocompleteItem])
def autocomplete(q: str = Query(""), db: Session = Depends(get_db)):
    if len(q.strip()) < 2:
        return []
    pattern = f"%{q.strip()}%"

    models = (
        db.query(Car.model, Brand.name)
        .join(Car.brand)
        .filter(Car.is_active == 1, Car.model.ilike(pattern))
        .distinct()
        .order_by(Car.model)
        .limit(7)
        .all()
    )
    brands = (
        db.query(Brand.name)
        .filter(Brand.name.ilike(pattern))
        .distinct()
        .order_by(Brand.name)
        .limit(3)
        .all()
    )

    results = [AutocompleteItem(type="model", label=m[0], brand=m[1]) for m in models]
    model_brands = {r.brand for r in results}
    for (b,) in brands:
        if b not in model_brands:
            results.append(AutocompleteItem(type="brand", label=b))

    return results[:10]


@router.get("/{car_id}", response_model=CarOut)
def get_car(car_id: int, db: Session = Depends(get_db)):
    car = (
        with_brand(db.query(Car))
        .filter(Car.id == car_id, Car.is_active == 1)
        .first()
    )
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    car.view_count += 1
    db.commit()
    db.refresh(car)
    return car


@router.get("", response_model=PaginatedCars)
def list_cars(
    brand: str | None = None,
    fuel_type: str | None = None,
    transmission: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    seats: int | None = None,
    search: str | None = None,
    model: str | None = None,
    sort: str = "price_asc",
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = (
        with_brand_light(db.query(Car))
        .join(Car.brand)
        .filter(Car.is_active == 1)
    )

    if brand:
        query = query.filter(Brand.name == brand)
    if model:
        query = query.filter(Car.model == model)
    if fuel_type:
        query = query.filter(Car.fuel_type == fuel_type)
    if transmission:
        query = query.filter(Car.transmission == transmission)
    if min_price is not None:
        query = query.filter(Car.price >= min_price)
    if max_price is not None:
        query = query.filter(Car.price <= max_price)
    if seats is not None:
        query = query.filter(Car.seats >= seats)
    if search:
        query = query.filter(
            or_(Car.model.ilike(f'%{search}%'), Brand.name.ilike(f'%{search}%'))
        )

    sort_map = {
        "price_asc": Car.price.asc(),
        "price_desc": Car.price.desc(),
        "mileage_desc": Car.mileage.desc(),
        "year_desc": Car.year.desc(),
        "none": Car.id.asc(),
    }
    order = sort_map.get(sort, Car.year.desc())
    query = query.order_by(order)

    all_cars = query.all()

    from collections import defaultdict

    def best_car(cars):
        if sort == "price_asc":
            valid = [c for c in cars if c.price is not None]
            return min(valid, key=lambda c: float(c.price)) if valid else cars[0]
        if sort == "price_desc":
            valid = [c for c in cars if c.price is not None]
            return max(valid, key=lambda c: float(c.price)) if valid else cars[0]
        if sort == "mileage_desc":
            valid = [c for c in cars if c.mileage is not None]
            return max(valid, key=lambda c: float(c.mileage)) if valid else cars[0]
        if sort == "none":
            return cars[0]
        # year_desc default
        valid = [c for c in cars if c.year is not None]
        return max(valid, key=lambda c: c.year) if valid else cars[0]

    sort_key_map = {
        "price_asc":    lambda c: (c.price   is None,  float(c.price   or 0)),
        "price_desc":   lambda c: (c.price   is None, -float(c.price   or 0)),
        "mileage_desc": lambda c: (c.mileage is None, -float(c.mileage or 0), float(c.price or 0)),
        "year_desc":    lambda c: (c.year    is None, -(c.year         or 0),  float(c.price or 0)),
    }

    if model:
        # Exact single-model lookup (used for the "other years available"
        # sibling list on the detail page) — one representative row per
        # year, since a single (model, year) can have 70+ near-duplicate
        # rows and would otherwise crowd out the actual year variety.
        year_groups: dict = defaultdict(list)
        for car in all_cars:
            year_groups[car.year].append(car)
        unique = [best_car(g) for g in year_groups.values()]
        if sort != "none":
            unique.sort(key=sort_key_map.get(sort, sort_key_map["year_desc"]))
    elif search:
        # Free-text search: show the individual matching rows as-is, so
        # e.g. searching "swift" surfaces its real year/price spread
        # across pages rather than collapsing to one pick.
        unique = all_cars
    else:
        # Plain, unfiltered browse view: one card per (brand, model).
        groups: dict = defaultdict(list)
        for car in all_cars:
            groups[(car.brand_id, car.model)].append(car)
        unique = [best_car(g) for g in groups.values()]
        if sort != "none":
            unique.sort(key=sort_key_map.get(sort, sort_key_map["year_desc"]))

    total = len(unique)
    items = unique[(page - 1) * limit : page * limit]

    return PaginatedCars(total=total, page=page, page_size=limit, items=items)
