from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.car import Car
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.car import OwnershipRequest, OwnershipResult, DepreciationResult, EMIRequest, EMIResult
from app.services.ownership_cost import calculate_ownership
from app.services.depreciation import calculate_depreciation
from app.services.emi import calculate_emi

router = APIRouter(prefix="/calculators", tags=["calculators"])


@router.post("/emi", response_model=EMIResult)
def emi(req: EMIRequest, current_user: User = Depends(get_current_user)):
    if req.down_payment > req.on_road_price:
        raise HTTPException(status_code=400, detail="Down payment cannot exceed on-road price")
    if not (1 <= req.tenure_months <= 84):
        raise HTTPException(status_code=400, detail="Tenure must be between 1 and 84 months")
    return calculate_emi(req.on_road_price, req.down_payment, req.interest_rate, req.tenure_months)


@router.post("/ownership", response_model=OwnershipResult)
def ownership_cost(req: OwnershipRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    car = (
        db.query(Car)
        .options(joinedload(Car.brand))
        .filter(Car.id == req.car_id, Car.is_active == 1)
        .first()
    )
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return calculate_ownership(
        car, req.years, req.annual_km, req.fuel_price,
        req.condition, req.accident_history, req.multiple_owners, req.no_service_records,
    )


@router.get("/depreciation/{car_id}", response_model=DepreciationResult)
def depreciation(
    car_id: int,
    condition: str = Query("good"),
    accident_history: bool = Query(False),
    multiple_owners: bool = Query(False),
    no_service_records: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    car = (
        db.query(Car)
        .options(joinedload(Car.brand))
        .filter(Car.id == car_id, Car.is_active == 1)
        .first()
    )
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return calculate_depreciation(car, condition, accident_history, multiple_owners, no_service_records)
