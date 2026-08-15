"""
Shared SQLAlchemy query-building blocks for Car queries.

Every endpoint that returns cars joins in `brand` (the frontend always
needs it) the same way; list/bulk endpoints also defer `gallery_images`
since it's a large JSON blob not needed until a single car's detail page
is opened. This was previously copy-pasted across cars.py, favorites.py,
recommendations.py and calculators.py - centralized here so the two
patterns can't drift (e.g. one endpoint quietly eager-loading galleries
for hundreds of list rows).
"""
from sqlalchemy.orm import Query, joinedload, defer

from app.models.car import Car


def with_brand(query: Query) -> Query:
    """Eager-load Brand - for queries returning one or a few full Car rows."""
    return query.options(joinedload(Car.brand))


def with_brand_light(query: Query) -> Query:
    """Eager-load Brand but defer gallery_images - for list/bulk Car queries."""
    return query.options(joinedload(Car.brand), defer(Car.gallery_images))
