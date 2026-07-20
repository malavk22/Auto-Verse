from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload, defer

from app.database import get_db
from app.models.car import Car, Brand
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.car import RecommendRequest, RecommendResult
from app.services.recommendation import recommend_cars

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("", response_model=list[RecommendResult])
def get_recommendations(req: RecommendRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = (
        db.query(Car)
        .options(joinedload(Car.brand), defer(Car.gallery_images))
        .join(Car.brand)
        .filter(Car.is_active == 1, Car.price <= req.budget)
    )
    if req.fuel_type:
        query = query.filter(Car.fuel_type == req.fuel_type)
    if req.transmission:
        query = query.filter(Car.transmission == req.transmission)
    return recommend_cars(query.all(), req)
