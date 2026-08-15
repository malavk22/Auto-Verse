"""
Body-type (segment) classification for cars, keyed by model name.

The dataset has no body_type column - all 10,000+ rows were seeded from a
CSV/scraped source with only brand/model/year/spec fields. Body type doesn't
vary by year or trim for a given model (a Swift is always a hatchback), so
rather than adding and backfilling a new DB column across every row, this is
a one-time model-name -> segment lookup (all 97 distinct models currently in
the dataset, classified against each manufacturer's actual market segment)
used by the recommendation engine to filter/score by body type.

If a new model is added to the dataset later without an entry here, it's
simply excluded from every body-type filter (never wrongly bucketed) - see
tests/test_body_type.py.
"""

HATCHBACK = "Hatchback"
SEDAN = "Sedan"
SUV = "SUV"
MUV = "MUV"

BODY_TYPES = [HATCHBACK, SEDAN, SUV, MUV]

MODEL_BODY_TYPE = {
    # ── Hatchback ────────────────────────────────────────────────────────────
    "C3": HATCHBACK, "eC3": HATCHBACK, "Jazz": HATCHBACK, "i10": HATCHBACK,
    "i20": HATCHBACK, "Baleno": HATCHBACK, "Swift": HATCHBACK, "WagonR": HATCHBACK,
    "Cooper S": HATCHBACK, "Kwid": HATCHBACK, "Altroz": HATCHBACK, "Tiago": HATCHBACK,
    "Glanza": HATCHBACK, "Polo": HATCHBACK,

    # ── Sedan ────────────────────────────────────────────────────────────────
    "A4": SEDAN, "A6": SEDAN, "3 Series": SEDAN, "Seal": SEDAN, "Amaze": SEDAN,
    "City": SEDAN, "Civic": SEDAN, "Verna": SEDAN, "ES": SEDAN, "Dzire": SEDAN,
    "C-Class": SEDAN, "Octavia": SEDAN, "Rapid": SEDAN, "Slavia": SEDAN,
    "Superb": SEDAN, "Camry": SEDAN, "Vento": SEDAN, "Virtus": SEDAN,

    # ── MUV / MPV ────────────────────────────────────────────────────────────
    "eMAX 7": MUV, "Carens": MUV, "Carnival": MUV, "Ertiga": MUV, "Lodgy": MUV,
    "Triber": MUV, "Innova": MUV,

    # ── SUV (includes crossovers / coupe-SUVs) ──────────────────────────────
    "Q3": SUV, "Q5": SUV, "X1": SUV, "X3": SUV, "Atto 3": SUV, "Sealion 7": SUV,
    "Basalt": SUV, "C3 Aircross": SUV, "Elevate": SUV, "WR-V": SUV,
    "Creta": SUV, "Creta Electric": SUV, "Venue": SUV, "F-Pace": SUV,
    "Compass": SUV, "Meridian": SUV, "Wrangler": SUV,
    "EV6": SUV, "Seltos": SUV, "Sonet": SUV, "Syros": SUV,
    "Defender": SUV, "Range Rover Evoque": SUV, "NX": SUV,
    "BE 6": SUV, "Bolero": SUV, "Scorpio": SUV, "Thar": SUV, "XUV300": SUV, "XUV700": SUV,
    "e Vitara": SUV, "GLC": SUV, "GLE": SUV,
    "Astor": SUV, "Hector": SUV, "Majestor": SUV, "Windsor EV": SUV,
    "Countryman": SUV, "Magnite": SUV, "X-Trail": SUV,
    "Cayenne": SUV, "Macan": SUV, "Duster": SUV, "Kiger": SUV,
    "Kushaq": SUV, "Kylaq": SUV, "Harrier": SUV, "Nexon": SUV, "Punch": SUV, "Sierra": SUV,
    "Fortuner": SUV, "Urban Cruiser": SUV, "Urban Cruiser Taisor": SUV,
    "Taigun": SUV, "Tayron": SUV, "Tiguan": SUV, "EX30": SUV, "XC60": SUV,
}


def body_type_of(model: str) -> str | None:
    return MODEL_BODY_TYPE.get(model)


def models_for_body_type(body_type: str) -> list[str]:
    return [m for m, bt in MODEL_BODY_TYPE.items() if bt == body_type]
