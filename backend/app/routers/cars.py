from __future__ import annotations

from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, distinct, case
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.car import Car, Brand
from sqlalchemy import or_, and_
from app.query_helpers import with_brand, with_brand_light
from app.schemas.car import CarOut, CarListItem, PaginatedCars, FilterOptions, AutocompleteItem, HomeHighlights, CategoryPreview
from app.services.body_type import BODY_TYPES, models_for_body_type, body_type_of

router = APIRouter(prefix="/cars", tags=["cars"])


@router.get("/filters/options", response_model=FilterOptions)
def get_filter_options(db: Session = Depends(get_db)):
    # Not cached: the dataset only changes via offline seed scripts, and a
    # process-lifetime cache here previously went stale on new data. These
    # are indexed DISTINCT/MIN/MAX scans, cheap at this dataset size.
    brands = [r[0] for r in db.query(distinct(Brand.name)).order_by(Brand.name).all()]
    fuels = [r[0] for r in db.query(distinct(Car.fuel_type)).filter(Car.fuel_type.isnot(None)).order_by(Car.fuel_type).all()]
    transmissions = [r[0] for r in db.query(distinct(Car.transmission)).filter(Car.transmission.isnot(None)).order_by(Car.transmission).all()]
    seats = sorted([r[0] for r in db.query(distinct(Car.seats)).filter(Car.seats.isnot(None)).all()])
    min_price = db.query(func.min(Car.price)).scalar()
    max_price = db.query(func.max(Car.price)).scalar()
    model_count = db.query(distinct(Car.model)).count()

    return FilterOptions(
        brands=brands,
        fuel_types=fuels,
        transmissions=transmissions,
        seat_options=seats,
        min_price=min_price,
        max_price=max_price,
        model_count=model_count,
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
    # Same reasoning as list_cars' search filter - each word can match
    # brand or model independently.
    word_conditions = [
        or_(Car.model.ilike(f'%{w}%'), Brand.name.ilike(f'%{w}%'))
        for w in q.strip().split()
    ]

    models = (
        db.query(Car.model, Brand.name)
        .join(Car.brand)
        .filter(Car.is_active == 1, and_(*word_conditions))
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


@router.get("/home/highlights", response_model=HomeHighlights)
def get_home_highlights(db: Session = Depends(get_db)):
    base = with_brand_light(db.query(Car)).join(Car.brand).filter(Car.is_active == 1)

    trending = base.order_by(Car.view_count.desc()).limit(8).all()
    categories = {}
    for bt in BODY_TYPES:
        models = models_for_body_type(bt)
        car = base.filter(Car.model.in_(models)).order_by(Car.price.desc()).first()
        model_count = (
            db.query(func.count(distinct(Car.model)))
            .filter(Car.is_active == 1, Car.model.in_(models))
            .scalar()
        )
        categories[bt] = CategoryPreview(car=car, model_count=model_count)

    brand_model_counts = dict(
        db.query(Brand.name, func.count(distinct(Car.model)))
        .join(Car, Car.brand_id == Brand.id)
        .filter(Car.is_active == 1)
        .group_by(Brand.name)
        .all()
    )

    return HomeHighlights(trending=trending, categories=categories, brand_model_counts=brand_model_counts)


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


@router.get("/{car_id}/similar", response_model=list[CarListItem])
def get_similar_cars(car_id: int, limit: int = 8, db: Session = Depends(get_db)):
    car = db.query(Car).filter(Car.id == car_id, Car.is_active == 1).first()
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")

    bt = body_type_of(car.model)
    price = car.price

    # One representative row per (brand, model) - same ROW_NUMBER dedup as
    # the browse view - picked as the closest price to this car's.
    base = with_brand_light(db.query(Car)).join(Car.brand).filter(
        Car.is_active == 1, Car.model != car.model
    )
    if price is not None:
        price_diff = func.abs(Car.price - price)
        pick_order = (case((Car.price.is_(None), 1), else_=0), price_diff.asc())
    else:
        pick_order = (case((Car.year.is_(None), 1), else_=0), Car.year.desc())

    rn = func.row_number().over(partition_by=(Car.brand_id, Car.model), order_by=pick_order).label("rn")
    ranked = base.add_columns(rn).subquery()
    rep_ids = [r[0] for r in db.query(ranked.c.id).filter(ranked.c.rn == 1).all()]
    reps = with_brand_light(db.query(Car)).filter(Car.id.in_(rep_ids)).all() if rep_ids else []

    def in_price_band(c):
        if price is None or c.price is None:
            return False
        return float(price) * 0.75 <= float(c.price) <= float(price) * 1.25

    # Tier 1: same body type + within 25% price. Tier 2: same brand, any
    # price. Tier 3: closest price, any brand. Each tier fills gaps the
    # previous one left, so even a rare model still returns a full row.
    tier1 = [c for c in reps if bt and body_type_of(c.model) == bt and in_price_band(c)]
    tier2 = [c for c in reps if c.brand.name == car.brand.name]
    tier3 = sorted(
        (c for c in reps if c.price is not None),
        key=lambda c: abs(float(c.price) - float(price)) if price is not None else 0,
    )

    result, seen = [], set()
    for pool in (tier1, tier2, tier3):
        for c in pool:
            if c.id in seen:
                continue
            seen.add(c.id)
            result.append(c)
            if len(result) >= limit:
                break
        if len(result) >= limit:
            break

    return result


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
    body_type: str | None = None,
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
        # Each word has to match brand OR model, but different words can
        # match different fields - otherwise "Honda City" matches nothing,
        # since neither field alone contains the full two-word string.
        words = search.split()
        query = query.filter(
            and_(*[or_(Car.model.ilike(f'%{w}%'), Brand.name.ilike(f'%{w}%')) for w in words])
        )
    if body_type:
        # Body type isn't a DB column (see app/services/body_type.py) - it's
        # a model-name -> segment lookup, same one the recommendation engine
        # uses, so "Shop by body type" and recommendations can't drift apart.
        query = query.filter(Car.model.in_(models_for_body_type(body_type)))

    sort_map = {
        "price_asc": Car.price.asc(),
        "price_desc": Car.price.desc(),
        "mileage_desc": Car.mileage.desc(),
        "year_desc": Car.year.desc(),
        "popular": Car.view_count.desc(),
        "none": Car.id.asc(),
    }
    order = sort_map.get(sort, Car.year.desc())

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
        if sort == "popular":
            return max(cars, key=lambda c: c.view_count or 0)
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
        "popular":      lambda c: -(c.view_count or 0),
    }

    if model:
        # Exact single-model lookup (used for the "other years available"
        # sibling list on the detail page) — one representative row per
        # year, since a single (model, year) can have 70+ near-duplicate
        # rows and would otherwise crowd out the actual year variety. Small
        # result set (one model's rows only), so plain Python grouping is
        # fine here - no need for the SQL-side approach below.
        all_cars = query.order_by(order).all()
        year_groups: dict = defaultdict(list)
        for car in all_cars:
            year_groups[car.year].append(car)
        unique = [best_car(g) for g in year_groups.values()]
        if sort != "none":
            unique.sort(key=sort_key_map.get(sort, sort_key_map["year_desc"]))
    else:
        # Plain browse view (also covers free-text search - it shares this
        # same dedup, see below): one card per (brand, model). This used to
        # fetch every matching row (up to the full ~10k-row table) and
        # group/dedup it in Python on every single request - cheap in
        # isolation, but since Python's GIL serializes that CPU-bound work,
        # a handful of concurrent requests (a normal page load fires
        # several) queued up behind each other badly (confirmed via
        # sys.dm_exec_requests: SQL Server was done and sitting in
        # ASYNC_NETWORK_IO, i.e. waiting on the app to read rows it
        # already had ready - not a database problem at all).
        #
        # Picking the one representative row per (brand_id, model) group
        # via ROW_NUMBER() lets SQL Server do that reduction - the ORM
        # then only ever hydrates one row per unique model (a few hundred,
        # not thousands) regardless of table size.
        #
        # Free-text search used to have its own branch here that skipped
        # this dedup entirely ("show every matching row, so you see the
        # real year/price spread") - in practice that meant searching a
        # single model (e.g. "Slavia") surfaced 190+ near-identical rows
        # across 10 pages, reading as broken/duplicated rather than useful.
        # Folding search into this same one-per-model dedup fixes that for
        # every search term, not just that one - the year/price spread is
        # still one click away via a car's own "Other Years Available".
        # T-SQL has no NULLS LAST syntax (unlike Postgres/standard SQL) - a
        # leading "is this null" CASE column, ordered ascending, pushes
        # NULLs after real values in either direction.
        def nulls_last(col, descending):
            return (case((col.is_(None), 1), else_=0), col.desc() if descending else col.asc())

        pick_order_map = {
            "price_asc": nulls_last(Car.price, False),
            "price_desc": nulls_last(Car.price, True),
            "mileage_desc": nulls_last(Car.mileage, True),
            "popular": (Car.view_count.desc(),),
            "none": (Car.id.asc(),),
        }
        pick_order = pick_order_map.get(sort, nulls_last(Car.year, True))

        rn = func.row_number().over(
            partition_by=(Car.brand_id, Car.model), order_by=pick_order
        ).label("rn")
        ranked_subq = query.add_columns(rn).subquery()
        ids = [r[0] for r in db.query(ranked_subq.c.id).filter(ranked_subq.c.rn == 1).all()]

        unique = with_brand_light(db.query(Car)).filter(Car.id.in_(ids)).all() if ids else []
        if sort != "none":
            unique.sort(key=sort_key_map.get(sort, sort_key_map["year_desc"]))

    total = len(unique)
    items = unique[(page - 1) * limit : page * limit]

    return PaginatedCars(total=total, page=page, page_size=limit, items=items)
