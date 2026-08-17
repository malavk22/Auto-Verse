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


class CategoryPreview(BaseModel):
    car: CarListItem | None
    model_count: int


class HomeHighlights(BaseModel):
    """Everything Home needs from `cars`, in one round trip.

    Home used to make one full `/cars` list call per section it needed
    imagery for (trending, one per body-type tile) - each of those fetches
    every matching row and dedups/groups it in Python, so firing 5+ of
    them at once on mount queued up behind each other instead of
    genuinely running in parallel. This endpoint runs the same handful of
    cheap, LIMIT-bounded queries server-side in a single request instead.
    """
    trending: list[CarListItem]
    categories: dict[str, CategoryPreview]
    brand_model_counts: dict[str, int]


class FilterOptions(BaseModel):
    brands: list[str]
    fuel_types: list[str]
    transmissions: list[str]
    seat_options: list[int]
    min_price: Decimal | None
    max_price: Decimal | None
    model_count: int


class FavoriteIdsResponse(BaseModel):
    car_ids: list[int]


# ── Ownership Calculator ──────────────────────────────────────────────────────

class OwnershipRequest(BaseModel):
    car_id: int
    years: int = 5
    annual_km: int = 15000
    fuel_price: Decimal = Decimal("103")
    condition: str = "good"
    accident_history: bool = False
    multiple_owners: bool = False
    no_service_records: bool = False


class OwnershipResult(BaseModel):
    car_id: int
    brand: str
    model: str
    ex_showroom_price: Decimal
    annual_fuel_cost: Decimal
    annual_insurance: Decimal
    annual_maintenance: Decimal
    total_depreciation: Decimal
    total_ownership_cost: Decimal
    cost_per_year: Decimal
    cost_per_km: Decimal
    condition: str
    condition_multiplier: Decimal
    standard_resale_value: Decimal
    adjusted_resale_value: Decimal


# ── EMI Calculator ────────────────────────────────────────────────────────────

class EMIRequest(BaseModel):
    on_road_price: Decimal
    down_payment: Decimal
    interest_rate: Decimal = Decimal("9.5")
    tenure_months: int = 60


class EMIScheduleEntry(BaseModel):
    year: int
    principal_paid: Decimal
    interest_paid: Decimal
    balance: Decimal


class EMIResult(BaseModel):
    on_road_price: Decimal
    down_payment: Decimal
    down_payment_pct: Decimal
    loan_amount: Decimal
    interest_rate: Decimal
    tenure_months: int
    monthly_emi: Decimal
    total_interest: Decimal
    total_payment: Decimal
    schedule: list[EMIScheduleEntry]


# ── Depreciation ─────────────────────────────────────────────────────────────

class DepreciationEntry(BaseModel):
    year: int
    percentage: int
    value: Decimal
    adjusted_value: Decimal


class DepreciationResult(BaseModel):
    car_id: int
    brand: str
    model: str
    purchase_price: Decimal
    condition_multiplier: Decimal
    schedule: list[DepreciationEntry]


# ── Recommendations ───────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    budget: Decimal
    fuel_type: str | None = None
    seats: int | None = None
    transmission: str | None = None
    priority: str | None = None       # "efficiency" | "low_maintenance"
    use_case: str | None = None       # "city" | "highway" | "family" | "first_car"
    year_preference: str | None = None  # "2020" | "2022"
    brands: list[str] | None = None       # e.g. ["Honda", "Toyota"]
    body_type: str | None = None          # "Hatchback" | "Sedan" | "SUV" | "MUV"
    top_n: int = 6


class RecommendCarItem(CarListItem):
    """Same shape as CarListItem, plus service_cost (used in match reasons)."""
    service_cost: Decimal | None


class RecommendResult(BaseModel):
    car: RecommendCarItem
    score: int
    reasons: list[str]


class AutocompleteItem(BaseModel):
    type: str        # "model" or "brand"
    label: str
    brand: str | None = None
