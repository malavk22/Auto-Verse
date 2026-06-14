from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import cars
from app.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    with engine.connect() as conn:
        conn.execute(engine.dialect.statement_compiler(engine.dialect, None).__class__.__mro__[0].__new__(engine.dialect.statement_compiler))
    yield

app = FastAPI(title="AutoVerse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
     allow_origins=["http://localhost:5173", "http://localhost:3000"],
     allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cars.router, prefix="/api/v1")


@app.get("/")
def health():
    return {"status": "ok", "app": "AutoVerse API"}
