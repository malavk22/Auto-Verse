from __future__ import annotations

from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session, joinedload, defer

from app.database import get_db
from app.models.car import Car, Brand
from app.schemas.car import CarOut, CarListItem, PaginatedCars, FilterOptions

router = APIRouter(prefix="/cars", tags=["cars"])

_filter_options_cache: FilterOptions | None = None


@router.get("/filters/options", response_model=FilterOptions)
def get_filter_options(db: Session = Depends(get_db)):
    global _filter_options_cache
    if _filter_options_cache is not None:
        return _filter_options_cache

    brands = [r[0] for r in db.query(distinct(Brand.name)).order_by(Brand.name).all()]
    fuels = [r[0] for r in db.query(distinct(Car.fuel_type)).filter(Car.fuel_type.isnot(None)).order_by(Car.fuel_type).all()]
    transmissions = [r[0] for r in db.query(distinct(Car.transmission)).filter(Car.transmission.isnot(None)).order_by(Car.transmission).all()]
    seats = sorted([r[0] for r in db.query(distinct(Car.seats)).filter(Car.seats.isnot(None)).all()])
    min_price = db.query(func.min(Car.price)).scalar()
    max_price = db.query(func.max(Car.price)).scalar()

    _filter_options_cache = FilterOptions(
        brands=brands,
        fuel_types=fuels,
        transmissions=transmissions,
        seat_options=seats,
        min_price=min_price,
        max_price=max_price,
    )
    return _filter_options_cache


@router.get("/brands", response_model=list[str])
def get_brands(db: Session = Depends(get_db)):
    return [r[0] for r in db.query(distinct(Brand.name)).order_by(Brand.name).all()]


@router.get("/compare", response_model=list[CarOut])
def compare_cars(ids: str = Query(..., description="Comma-separated car IDs, max 3"), db: Session = Depends(get_db)):
    id_list = [int(i) for i in ids.split(",") if i.strip().isdigit()][:3]
    if not id_list:
        raise HTTPException(status_code=400, detail="Provide at least one valid car ID")
    cars = (
        db.query(Car)
        .options(joinedload(Car.brand))
        .filter(Car.id.in_(id_list), Car.is_active == 1)
        .all()
    )
    for car in cars:
        car.compare_count += 1
    db.commit()
    for car in cars:
        db.refresh(car)
    return cars


@router.get("/{car_id}", response_model=CarOut)
def get_car(car_id: int, db: Session = Depends(get_db)):
    car = (
        db.query(Car)
        .options(joinedload(Car.brand))
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
    sort: str = "price_asc",
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = (
        db.query(Car)
        .options(joinedload(Car.brand), defer(Car.gallery_images))
        .join(Car.brand)
        .filter(Car.is_active == 1)
    )

    if brand:
        query = query.filter(Brand.name == brand)
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

    sort_map = {
        "price_asc": Car.price.asc(),
        "price_desc": Car.price.desc(),
        "mileage_desc": Car.mileage.desc(),
        "year_desc": Car.year.desc(),
    }
    order = sort_map.get(sort, Car.year.desc())
    query = query.order_by(order)

    # Group all matching cars by (brand_id, model) and pick best per group
    from collections import defaultdict
    all_cars = query.all()
    groups: dict = defaultdict(list)
    for car in all_cars:
        groups[(car.brand_id, car.model)].append(car)

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
        # year_desc default
        valid = [c for c in cars if c.year is not None]
        return max(valid, key=lambda c: c.year) if valid else cars[0]

    unique = [best_car(g) for g in groups.values()]

    sort_key_map = {
        "price_asc":    lambda c: (c.price   is None,  float(c.price   or 0)),
        "price_desc":   lambda c: (c.price   is None, -float(c.price   or 0)),
        "mileage_desc": lambda c: (c.mileage is None, -float(c.mileage or 0), float(c.price or 0)),
        "year_desc":    lambda c: (c.year    is None, -(c.year         or 0),  float(c.price or 0)),
    }
    unique.sort(key=sort_key_map.get(sort, sort_key_map["year_desc"]))

    total = len(unique)
    items = unique[(page - 1) * limit : page * limit]

    return PaginatedCars(total=total, page=page, page_size=limit, items=items)
