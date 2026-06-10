from __future__ import annotations
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BrandOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class CarListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    brand: BrandOut
    model: str
    year: int | None
    fuel_type: str | None
    transmission: str | None
    price: Decimal | None
    mileage: Decimal | None
    seats: int | None


class CarOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    brand: BrandOut
    model: str
    year: int | None
    fuel_type: str | None
    transmission: str | None
    price: Decimal | None
    mileage: Decimal | None
    engine_cc: int | None
    seats: int | None
    service_cost: Decimal | None
    view_count: int
    compare_count: int
    is_active: int
    created_at: datetime | None = None


class PaginatedCars(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[CarListItem]


class FilterOptions(BaseModel):
    brands: list[str]
    fuel_types: list[str]
    transmissions: list[str]
    seat_options: list[int]
    min_price: Decimal | None
    max_price: Decimal | None
