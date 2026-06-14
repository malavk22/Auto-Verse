"""
Dataset quality validator — run this on any Indian car CSV before importing.

Usage:
    python pipeline/validate_dataset.py path/to/dataset.csv

Checks:
  1. Shape and columns
  2. Null / missing values
  3. Fuel type distribution (per model — catches randomized fuel types)
  4. Transmission distribution (per model — catches impossible combos)
  5. Mileage sanity (EVs with kmpl? Fortuner at 30?)
  6. Engine CC sanity (EVs with CC? Kwid at 2400cc?)
  7. Price sanity (Kwid at ₹35L? Camry at ₹5L?)
  8. Seat count sanity (Amaze 7-seater? Thar 6-seater?)
  9. Brand/model name consistency (duplicates like "Maruti" vs "Maruti Suzuki")
 10. Year range sanity
"""

from __future__ import annotations

import sys
import re
import pandas as pd

# ── Known ground-truth constraints ────────────────────────────────────────────
# Used to flag impossible combinations. Add more as needed.

# Models that should NEVER have these fuel types
IMPOSSIBLE_FUEL = {
    "EV6":      {"Petrol", "Diesel", "CNG"},
    "Nexon EV": {"Petrol", "Diesel", "CNG"},
    "Swift":    {"Diesel", "Electric"},         # no diesel post-2020, no EV
    "Kwid":     {"Diesel", "CNG", "Electric"},
    "Fortuner": {"CNG", "Electric"},
    "Carnival": {"Petrol", "CNG", "Electric"},  # India spec
    "Thar":     {"CNG", "Electric"},
    "Camry":    {"Diesel", "CNG", "Electric"},
    "Superb":   {"Diesel", "CNG", "Electric"},
}

# Realistic mileage upper bounds (kmpl) per fuel type
MILEAGE_MAX = {
    "Petrol":   35,
    "Diesel":   30,
    "CNG":      40,
    "Electric": 0,   # should be NULL / 0 — not kmpl
}

# Realistic engine CC bounds (cc)
ENGINE_CC_MAX = {
    "Petrol":   3000,
    "Diesel":   3000,
    "CNG":      2000,
    "Electric": 0,   # should be NULL / 0
}

# Realistic price bounds (₹)
PRICE_BOUNDS = {
    "Kwid":     (4_00_000,   7_00_000),
    "Camry":    (40_00_000,  55_00_000),
    "Superb":   (30_00_000,  45_00_000),
    "Fortuner": (30_00_000,  55_00_000),
    "i10":      (5_00_000,   10_00_000),
    "EV6":      (55_00_000,  70_00_000),
}

# Real max seat counts per model
SEAT_MAX = {
    "Amaze": 5, "City": 5, "Civic": 5, "Jazz": 5, "WR-V": 5,
    "Creta": 5, "Venue": 5, "Verna": 5, "i10": 5, "i20": 5,
    "EV6": 5, "Seltos": 5, "Sonet": 5,
    "Bolero": 7, "Thar": 4, "XUV300": 5, "XUV700": 7,
    "Baleno": 5, "Dzire": 5, "Swift": 5, "WagonR": 5,
    "Kiger": 5, "Kwid": 5, "Duster": 5,
    "Kushaq": 5, "Octavia": 5, "Rapid": 5, "Slavia": 5, "Superb": 5,
    "Altroz": 5, "Harrier": 5, "Nexon": 5, "Punch": 5, "Tiago": 5,
    "Camry": 5, "Glanza": 5, "Urban Cruiser": 5,
    "Polo": 5, "Taigun": 5, "Vento": 5, "Virtus": 5, "Tiguan": 7,
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def sep(title: str):
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print('─' * 60)


def ok(msg):  print(f"  ✓  {msg}")
def warn(msg): print(f"  ⚠  {msg}")
def fail(msg): print(f"  ✗  {msg}")


def guess_col(df: pd.DataFrame, *candidates: str) -> str | None:
    for c in candidates:
        for col in df.columns:
            if col.lower().replace(" ", "_") == c.lower().replace(" ", "_"):
                return col
    return None


def parse_numeric(series: pd.Series) -> pd.Series:
    """Extract first number from strings like '1197 CC' or '23.2 kmpl'."""
    return series.astype(str).str.extract(r"([\d.]+)")[0].astype(float)


# ── Main ───────────────────────────────────────────────────────────────────────

def validate(path: str):
    print(f"\nLoading: {path}")
    try:
        df = pd.read_csv(path)
    except Exception as e:
        print(f"  ERROR: could not read file — {e}")
        sys.exit(1)

    # ── 1. Shape & columns ──────────────────────────────────────────────────
    sep("1. Shape & Columns")
    print(f"  Rows: {len(df):,}   Columns: {len(df.columns)}")
    print(f"  Columns: {list(df.columns)}")

    # ── 2. Null / missing values ────────────────────────────────────────────
    sep("2. Null / Missing Values")
    nulls = df.isnull().sum()
    null_cols = nulls[nulls > 0]
    if null_cols.empty:
        ok("No null values found")
    else:
        for col, count in null_cols.items():
            pct = count / len(df) * 100
            msg = f"{col}: {count} nulls ({pct:.1f}%)"
            warn(msg) if pct < 10 else fail(msg)

    # ── 3. Fuel type distribution per model ─────────────────────────────────
    sep("3. Fuel Type Distribution per Model")
    fuel_col   = guess_col(df, "fuel_type", "fuel", "fuel type")
    model_col  = guess_col(df, "model", "car_model", "name")

    if not fuel_col:
        warn("No fuel_type column found — skipping")
    else:
        print(f"  Fuel column: '{fuel_col}'")
        print(f"  Unique values: {sorted(df[fuel_col].dropna().unique())}")

        if model_col:
            all_fuels_per_model = df.groupby(model_col)[fuel_col].nunique()
            suspicious = all_fuels_per_model[all_fuels_per_model >= 4]
            if suspicious.empty:
                ok("No model has all 4 fuel types — looks realistic")
            else:
                fail(f"{len(suspicious)} models have 4 fuel types (likely randomized):")
                for m in suspicious.index[:10]:
                    fuels = df[df[model_col] == m][fuel_col].unique()
                    print(f"       {m}: {list(fuels)}")

            # Check impossible combos
            for model_kw, bad_fuels in IMPOSSIBLE_FUEL.items():
                mask = df[model_col].astype(str).str.contains(model_kw, case=False, na=False)
                if not mask.any():
                    continue
                actual_fuels = set(df[mask][fuel_col].dropna().unique())
                impossible = actual_fuels & bad_fuels
                if impossible:
                    fail(f"{model_kw} has impossible fuel types: {impossible}")
                else:
                    ok(f"{model_kw} fuel types look correct: {actual_fuels}")

    # ── 4. Transmission distribution per model ──────────────────────────────
    sep("4. Transmission Distribution per Model")
    trans_col = guess_col(df, "transmission", "trans")

    if not trans_col:
        warn("No transmission column found — skipping")
    else:
        print(f"  Transmission column: '{trans_col}'")
        print(f"  Unique values: {sorted(df[trans_col].dropna().unique())}")

        if model_col and fuel_col:
            # EV6 / electric cars should not have Manual
            ev_mask = df[fuel_col].astype(str).str.lower().isin(["electric", "ev"])
            ev_with_manual = df[ev_mask & (df[trans_col].astype(str).str.lower() == "manual")]
            if ev_with_manual.empty:
                ok("No electric vehicle has Manual transmission")
            else:
                fail(f"{len(ev_with_manual)} electric vehicle rows have Manual transmission")

    # ── 5. Mileage sanity ───────────────────────────────────────────────────
    sep("5. Mileage Sanity")
    mileage_col = guess_col(df, "mileage", "fuel_efficiency", "kmpl")

    if not mileage_col:
        warn("No mileage column found — skipping")
    else:
        mileage = parse_numeric(df[mileage_col])
        print(f"  Mileage column: '{mileage_col}'")
        print(f"  Range: {mileage.min():.1f} – {mileage.max():.1f}  |  Mean: {mileage.mean():.1f}")

        if mileage.max() > 50:
            fail(f"Max mileage {mileage.max():.1f} kmpl is unrealistically high (>50)")
        else:
            ok("Max mileage looks realistic")

        if fuel_col:
            ev_mask = df[fuel_col].astype(str).str.lower().isin(["electric", "ev"])
            ev_mileage = parse_numeric(df.loc[ev_mask, mileage_col])
            ev_with_kmpl = ev_mileage[ev_mileage > 0]
            if ev_with_kmpl.empty:
                ok("Electric vehicles have no kmpl value (correct)")
            else:
                fail(f"{len(ev_with_kmpl)} electric vehicle rows have a kmpl mileage value")

    # ── 6. Engine CC sanity ─────────────────────────────────────────────────
    sep("6. Engine CC Sanity")
    engine_col = guess_col(df, "engine_cc", "engine", "engine_size", "cc")

    if not engine_col:
        warn("No engine column found — skipping")
    else:
        engine = parse_numeric(df[engine_col])
        print(f"  Engine column: '{engine_col}'")
        print(f"  Range: {engine.min():.0f} – {engine.max():.0f} cc  |  Mean: {engine.mean():.0f} cc")

        if engine.max() > 5000:
            fail(f"Max engine CC {engine.max():.0f} is unrealistically high")
        elif engine.min() < 500 and (engine < 500).sum() > 5:
            warn(f"{(engine < 500).sum()} rows have engine CC < 500 (possibly EVs recorded as 0 or bad data)")
        else:
            ok("Engine CC range looks plausible")

        if fuel_col:
            ev_mask = df[fuel_col].astype(str).str.lower().isin(["electric", "ev"])
            ev_engine = parse_numeric(df.loc[ev_mask, engine_col])
            ev_with_cc = ev_engine[ev_engine > 0]
            if ev_with_cc.empty:
                ok("Electric vehicles have no engine CC (correct)")
            else:
                fail(f"{len(ev_with_cc)} electric vehicle rows have an engine CC value")

    # ── 7. Price sanity ─────────────────────────────────────────────────────
    sep("7. Price Sanity")
    price_col = guess_col(df, "price", "selling_price", "ex_showroom_price", "cost")

    if not price_col:
        warn("No price column found — skipping")
    else:
        price = parse_numeric(df[price_col])
        print(f"  Price column: '{price_col}'")
        print(f"  Range: ₹{price.min():,.0f} – ₹{price.max():,.0f}  |  Mean: ₹{price.mean():,.0f}")

        if model_col:
            for model_kw, (lo, hi) in PRICE_BOUNDS.items():
                mask = df[model_col].astype(str).str.contains(model_kw, case=False, na=False)
                if not mask.any():
                    continue
                model_price = parse_numeric(df.loc[mask, price_col])
                out_of_range = ((model_price < lo * 0.5) | (model_price > hi * 2)).sum()
                if out_of_range:
                    fail(f"{model_kw}: {out_of_range} rows outside expected ₹{lo//100000:.0f}L–₹{hi//100000:.0f}L range")
                else:
                    ok(f"{model_kw} prices within expected range")

    # ── 8. Seat count sanity ────────────────────────────────────────────────
    sep("8. Seat Count Sanity")
    seat_col = guess_col(df, "seats", "seating_capacity", "no_of_seats")

    if not seat_col:
        warn("No seats column found — skipping")
    else:
        seats = pd.to_numeric(df[seat_col], errors="coerce")
        print(f"  Seats column: '{seat_col}'")
        print(f"  Distribution:\n{seats.value_counts().sort_index().to_string()}")

        if model_col:
            for model_kw, max_seats in SEAT_MAX.items():
                mask = df[model_col].astype(str).str.contains(model_kw, case=False, na=False)
                if not mask.any():
                    continue
                over = (seats[mask] > max_seats).sum()
                if over:
                    fail(f"{model_kw}: {over} rows exceed real max seats ({max_seats})")
                else:
                    ok(f"{model_kw} seat counts correct (max {max_seats})")

    # ── 9. Brand / model name consistency ───────────────────────────────────
    sep("9. Brand / Model Name Consistency")
    brand_col = guess_col(df, "brand", "make", "company", "manufacturer")

    if brand_col:
        brands = df[brand_col].dropna().unique()
        print(f"  Unique brands ({len(brands)}): {sorted(brands)}")
        # look for duplicates differing only by case or spacing
        normalized = {}
        for b in brands:
            key = re.sub(r"\s+", " ", b.strip().lower())
            normalized.setdefault(key, []).append(b)
        dupes = {k: v for k, v in normalized.items() if len(v) > 1}
        if dupes:
            for k, variants in dupes.items():
                warn(f"Duplicate brand name variants: {variants}")
        else:
            ok("No duplicate brand name variants found")
    elif model_col:
        warn("No brand column — check model column for brand+model combined strings")
        print(f"  Unique model values (first 15): {list(df[model_col].dropna().unique()[:15])}")

    # ── 10. Year range ──────────────────────────────────────────────────────
    sep("10. Year Range Sanity")
    year_col = guess_col(df, "year", "model_year", "manufacturing_year")

    if not year_col:
        warn("No year column found — skipping")
    else:
        year = pd.to_numeric(df[year_col], errors="coerce")
        print(f"  Year range: {int(year.min())} – {int(year.max())}")
        old = (year < 2005).sum()
        future = (year > 2026).sum()
        if old:
            warn(f"{old} rows have year < 2005 (very old cars — intended?)")
        if future:
            fail(f"{future} rows have year > 2026 (future years — bad data)")
        if not old and not future:
            ok("Year range looks reasonable")

    # ── Summary ─────────────────────────────────────────────────────────────
    sep("SUMMARY")
    print("  Review all ✗ (fail) and ⚠ (warn) lines above.")
    print("  If fuel types per model are randomized (check 3), the dataset has the")
    print("  same root problem as the current synthetic dataset and is not a good replacement.")
    print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pipeline/validate_dataset.py path/to/dataset.csv")
        sys.exit(1)
    validate(sys.argv[1])
