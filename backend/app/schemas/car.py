from __future__ import annotations

import json
from decimal import Decimal
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, field_validator


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
    image_url: str | None = None


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
    image_url: str | None = None
    gallery_images: list[str] | None = None
    view_count: int
    compare_count: int
    is_active: int
    created_at: datetime | None = None

    @field_validator("gallery_images", mode="before")
    @classmethod
    def parse_gallery(cls, v: Any) -> list[str] | None:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return None
        return v


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
