from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.sql import func
from .database import Base

class ROIData(Base):rm -rf frontend
    __tablename__ = "roi_data"

    id = Column(Integer, primary_key=True, index=True)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())