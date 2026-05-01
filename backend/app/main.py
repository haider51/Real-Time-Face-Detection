from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine
from . import models
from .routers import video, roi

# Automatically create database tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Real-Time Face Detection API")

# Allow the frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the endpoints
app.include_router(video.router)
app.include_router(roi.router)

@app.get("/")
def root():
    return {"status": "Backend is running and database is connected!"}