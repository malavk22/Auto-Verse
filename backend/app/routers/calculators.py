from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.car import Car
from app.schemas.car import OwnershipRequest, OwnershipResult, DepreciationResult
from app.services.ownership_cost import calculate_ownership
from app.services.depreciation import calculate_depreciation

router = APIRouter(prefix="/calculators", tags=["calculators"])


@router.post("/ownership", response_model=OwnershipResult)
def ownership_cost(req: OwnershipRequest, db: Session = Depends(get_db)):
    car = (
        db.query(Car)
        .options(joinedload(Car.brand))
        .filter(Car.id == req.car_id, Car.is_active == 1)
        .first()
    )
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return calculate_ownership(car, req.years, req.annual_km, req.fuel_price)


@router.get("/depreciation/{car_id}", response_model=DepreciationResult)
def depreciation(car_id: int, db: Session = Depends(get_db)):
    car = (
        db.query(Car)
        .options(joinedload(Car.brand))
        .filter(Car.id == car_id, Car.is_active == 1)
        .first()
    )
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return calculate_depreciation(car)
