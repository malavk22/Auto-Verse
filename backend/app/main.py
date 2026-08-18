from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, engine, settings
from app.routers import cars, calculators, recommendations, auth, favorites

app = FastAPI(title="AutoVerse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


def _warm_connection_pool():
    # Opening a new DB connection is slow under concurrency here, and a page
    # load fires many API calls in parallel - without this, the first load
    # after every restart hit a cold pool and looked "stuck loading."
    # Pre-opening connections at startup pays that cost once instead.
    def _ping(_):
        conn = engine.connect()
        conn.execute(text("SELECT 1"))
        conn.close()  # returns the connection to the pool, doesn't close it

    with ThreadPoolExecutor(max_workers=engine.pool.size()) as pool:
        list(pool.map(_ping, range(engine.pool.size())))


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)
    _warm_connection_pool()


app.include_router(auth.router, prefix="/api/v1")
app.include_router(cars.router, prefix="/api/v1")
app.include_router(calculators.router, prefix="/api/v1")
app.include_router(recommendations.router, prefix="/api/v1")
app.include_router(favorites.router, prefix="/api/v1")


@app.get("/")
def health():
    return {"status": "ok", "app": "AutoVerse API"}
