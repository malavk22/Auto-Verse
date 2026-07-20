from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import cars, calculators, recommendations, auth, favorites

app = FastAPI(title="AutoVerse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)


app.include_router(auth.router, prefix="/api/v1")
app.include_router(cars.router, prefix="/api/v1")
app.include_router(calculators.router, prefix="/api/v1")
app.include_router(recommendations.router, prefix="/api/v1")
app.include_router(favorites.router, prefix="/api/v1")


@app.get("/")
def health():
    return {"status": "ok", "app": "AutoVerse API"}
