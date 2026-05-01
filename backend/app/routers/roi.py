from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db

router = APIRouter(prefix="/api/roi", tags=["ROI"])

# Endpoint 3: Serve the ROI data
@router.get("/")
def get_recent_roi(limit: int = 50, db: Session = Depends(get_db)):
    """Fetch the most recently detected ROIs from the database."""
    records = db.query(models.ROIData).order_by(models.ROIData.timestamp.desc()).limit(limit).all()
    return records