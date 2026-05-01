from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..services.face_detector import process_frame

router = APIRouter(prefix="/ws/feed", tags=["Video"])

# In-memory broadcaster to send the processed video to anyone watching
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] =[]

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: bytes):
        for connection in self.active_connections:
            try:
                await connection.send_bytes(message)
            except:
                pass

manager = ConnectionManager()

# Endpoint 1: Receive the video feed
@router.websocket("/upload")
async def upload_video(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            
            # Process the frame (Find face, draw box)
            processed_bytes, roi_data = process_frame(data)
            
            # Save ROI to Database
            if roi_data:
                new_roi = models.ROIData(
                    x=roi_data["x"],
                    y=roi_data["y"],
                    width=roi_data["width"],
                    height=roi_data["height"]
                )
                db.add(new_roi)
                db.commit()
                
            # Broadcast the processed frame with the box drawn on it
            await manager.broadcast(processed_bytes)
    except WebSocketDisconnect:
        pass

# Endpoint 2: Serve the video feed
@router.websocket("/stream")
async def stream_video(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() # Keep connection alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)