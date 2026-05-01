import io
import mediapipe as mp
from PIL import Image, ImageDraw
import numpy as np

# Initialize Mediapipe Face Detection
mp_face_detection = mp.solutions.face_detection
face_detection = mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)

def process_frame(image_bytes: bytes):
    """
    Takes an image in bytes, detects a face, draws a bounding box using PIL,
    and returns the processed image bytes and the ROI data.
    """
    # Open image with Pillow (Strictly No OpenCV!)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image_arr = np.array(image)
    
    # Process face detection via Mediapipe
    results = face_detection.process(image_arr)
    roi_data = None
    
    if results.detections:
        # Prompt assumption: Only one face will be present
        detection = results.detections[0]
        bboxC = detection.location_data.relative_bounding_box
        
        ih, iw, _ = image_arr.shape
        x = int(bboxC.xmin * iw)
        y = int(bboxC.ymin * ih)
        w = int(bboxC.width * iw)
        h = int(bboxC.height * ih)
        
        # Draw bounding box using Pillow
        draw = ImageDraw.Draw(image)
        draw.rectangle([x, y, x + w, y + h], outline="red", width=4)
        
        # Prepare ROI Data
        roi_data = {
            "x": max(0, x),
            "y": max(0, y),
            "width": w,
            "height": h
        }
        
    # Convert image back to bytes to send via WebSockets later
    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    processed_bytes = buf.getvalue()
    
    return processed_bytes, roi_data