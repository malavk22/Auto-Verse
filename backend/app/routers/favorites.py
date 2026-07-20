from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload, defer

from app.database import get_db
from app.models.car import Car
from app.models.favorite import Favorite
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.car import CarListItem, FavoriteIdsResponse

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("/ids", response_model=FavoriteIdsResponse)
def get_favorite_ids(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(Favorite.car_id).filter(Favorite.user_id == current_user.id).all()
    return FavoriteIdsResponse(car_ids=[r[0] for r in rows])


@router.get("", response_model=list[CarListItem])
def get_favorites(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cars = (
        db.query(Car)
        .join(Favorite, Favorite.car_id == Car.id)
        .options(joinedload(Car.brand), defer(Car.gallery_images))
        .filter(Favorite.user_id == current_user.id, Car.is_active == 1)
        .order_by(Favorite.created_at.desc())
        .all()
    )
    return cars


@router.post("/{car_id}", status_code=204)
def add_favorite(car_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    car = db.query(Car).filter(Car.id == car_id, Car.is_active == 1).first()
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    existing = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.car_id == car_id).first()
    if not existing:
        db.add(Favorite(user_id=current_user.id, car_id=car_id))
        db.commit()
    return Response(status_code=204)


@router.delete("/{car_id}", status_code=204)
def remove_favorite(car_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.car_id == car_id).delete()
    db.commit()
    return Response(status_code=204)
