"""
Shared condition-adjustment logic used by both the depreciation schedule and
the ownership-cost calculator. Previously duplicated verbatim in both
services - kept here once so the two calculators can't drift out of sync
with each other (see the IRDAI depreciation table fix in this project for
what that drift looks like when it happens).
"""
from decimal import Decimal

CONDITION_MULTIPLIERS = {
    "excellent": Decimal("1.05"),
    "good":      Decimal("1.00"),
    "fair":      Decimal("0.85"),
    "poor":      Decimal("0.70"),
    "damaged":   Decimal("0.50"),
}


def condition_multiplier(condition, accident_history, multiple_owners, no_service_records):
    m = CONDITION_MULTIPLIERS.get(condition, Decimal("1.00"))
    if accident_history:
        m *= Decimal("0.85")
    if multiple_owners:
        m *= Decimal("0.95")
    if no_service_records:
        m *= Decimal("0.92")
    return m
