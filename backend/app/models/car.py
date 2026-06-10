from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Brand(Base):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)

    cars = relationship("Car", back_populates="brand")


class Car(Base):
    __tablename__ = "cars"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=False)
    model = Column(String(100), nullable=False)
    year = Column(Integer)
    fuel_type = Column(String(50))
    transmission = Column(String(50))
    price = Column(Numeric(12, 2))
    mileage = Column(Numeric(6, 2))
    engine_cc = Column(Integer)
    seats = Column(Integer)
    service_cost = Column(Numeric(10, 2))
    view_count = Column(Integer, default=0, server_default="0")
    compare_count = Column(Integer, default=0, server_default="0")
    is_active = Column(Integer, default=1, server_default="1")  # BIT as INT for MSSQL compat
    created_at = Column(DateTime, server_default=func.now())

    brand = relationship("Brand", back_populates="cars")
