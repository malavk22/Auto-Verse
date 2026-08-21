from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str = "dev-only-insecure-secret-change-me"
    # Resend (https://resend.com) sends password-reset emails over HTTPS -
    # unlike raw SMTP, this isn't blocked by hosts (e.g. Render's free tier)
    # that block outbound SMTP ports to prevent spam abuse.
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "AutoVerse <onboarding@resend.dev>"
    FRONTEND_URL: str = "http://localhost:5173"
    # Comma-separated list of allowed CORS origins - see main.py. Defaults to
    # local dev; production sets this via App Service's env vars to the real
    # Vercel domain instead of touching code.
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    model_config = {"env_file": ".env"}


settings = Settings()

# pool_size/max_overflow set explicitly so main.py's startup warming can
# size itself off them. pool_recycle proactively drops connections older
# than 280s - opening a fresh one here is slow under concurrency, so this
# avoids several requests paying that cost together (see main.py).
engine = create_engine(settings.DATABASE_URL, echo=False, pool_size=10, max_overflow=10, pool_pre_ping=True, pool_recycle=280)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
