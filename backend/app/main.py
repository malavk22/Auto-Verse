from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import cars, calculators

app = FastAPI(title="AutoVerse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cars.router, prefix="/api/v1")
app.include_router(calculators.router, prefix="/api/v1")


@app.get("/")
def health():
    return {"status": "ok", "app": "AutoVerse API"}
