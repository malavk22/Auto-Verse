"""
Shared test fixtures.

The scoring/calculator services under app/services only ever read plain
attributes off the `car` object they're given (car.price, car.brand.name,
etc.) — they never touch the ORM or the database. So tests build lightweight
SimpleNamespace stand-ins instead of a real SQLAlchemy Car, which keeps this
suite fast and independent of a live SQL Server connection.
"""
from decimal import Decimal
from types import SimpleNamespace

import pytest


def make_car(
    id=1,
    brand_name="Maruti Suzuki",
    model="Swift",
    year=2022,
    fuel_type="Petrol",
    transmission="Manual",
    price=Decimal("1000000"),
    mileage=Decimal("20"),
    seats=5,
    engine_cc=1200,
    service_cost=Decimal("15000"),
    image_url=None,
):
    """Build a fake car object exposing the same attributes the services read."""
    return SimpleNamespace(
        id=id,
        brand=SimpleNamespace(id=1, name=brand_name),
        model=model,
        year=year,
        fuel_type=fuel_type,
        transmission=transmission,
        price=price,
        mileage=mileage,
        seats=seats,
        engine_cc=engine_cc,
        service_cost=service_cost,
        image_url=image_url,
    )


@pytest.fixture
def car():
    return make_car()
