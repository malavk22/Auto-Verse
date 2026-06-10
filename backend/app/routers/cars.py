from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.car import Car, Brand
from app.schemas.car import CarOut, CarListItem, PaginatedCars, FilterOptions

router = APIRouter(prefix="/cars", tags=["cars"])


@router.get("/filters/options", response_model=FilterOptions)
def get_filter_options(db: Session = Depends(get_db)):
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
        .options(joinedload(Car.brand))
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
    order = sort_map.get(sort, Car.price.asc())
    query = query.order_by(order)

    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()

    return PaginatedCars(total=total, page=page, page_size=limit, items=items)
