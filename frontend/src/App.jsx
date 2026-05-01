import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

// Connect to the backend on port 8000
const BACKEND_HOST = "localhost:8000";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [roiData, setRoiData] = useState([]);
  const[isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    // 1. Connect to the Stream WebSocket (to receive processed video)
    const streamWs = new WebSocket(`ws://${BACKEND_HOST}/ws/feed/stream`);
    streamWs.onmessage = (event) => {
      // Convert incoming bytes to an image URL and display it
      const blob = new Blob([event.data], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      if (imgRef.current) imgRef.current.src = url;
    };

    // 2. Fetch ROI Data periodically from the REST API
    const fetchRoi = async () => {
      try {
        const res = await axios.get(`http://${BACKEND_HOST}/api/roi/`);
        setRoiData(res.data);
      } catch (e) {
        console.error("Error fetching ROI:", e);
      }
    };
    const roiInterval = setInterval(fetchRoi, 2000);

    return () => {
      streamWs.close();
      clearInterval(roiInterval);
    };
  },[]);

  const startVideo = async () => {
    try {
      // Access the user's webcam
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
        startUploading();
      }
    } catch (err) {
      console.error("Error accessing webcam. Make sure permissions are granted!", err);
    }
  };

  const startUploading = () => {
    // Connect to the Upload WebSocket (to send raw video)
    const uploadWs = new WebSocket(`ws://${BACKEND_HOST}/ws/feed/upload`);
    
    uploadWs.onopen = () => {
        // Take a picture from the webcam 10 times a second and send it
        setInterval(() => {
          if (videoRef.current && canvasRef.current && uploadWs.readyState === WebSocket.OPEN) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            
            // Draw video frame to hidden canvas
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            
            // Convert to JPEG bytes and send to backend
            canvas.toBlob((blob) => {
              if (blob) uploadWs.send(blob);
            }, 'image/jpeg', 0.6);
          }
        }, 100); // 100ms = 10 FPS
    };
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1>🤖 Real-Time Face Detection System</h1>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        {/* Box 1: Raw Webcam Input */}
        <div style={{ border: '2px solid #ccc', padding: '10px', borderRadius: '8px' }}>
          <h3>1. Raw Webcam Feed</h3>
          <video ref={videoRef} style={{ width: '400px', backgroundColor: '#000' }} muted playsInline></video>
          <br/>
          {!isStreaming && (
            <button onClick={startVideo} style={{ marginTop: '10px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
              Start Camera & Send Feed
            </button>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        </div>
        
        {/* Box 2: Processed Output */}
        <div style={{ border: '2px solid #4CAF50', padding: '10px', borderRadius: '8px' }}>
          <h3>2. Processed Feed (From Backend)</h3>
          <img ref={imgRef} style={{ width: '400px', minHeight: '300px', backgroundColor: '#333' }} alt="Waiting for stream..." />
        </div>
      </div>

      {/* Box 3: Database Logs */}
      <div style={{ border: '2px solid #008CBA', padding: '10px', borderRadius: '8px', maxWidth: '840px' }}>
        <h3>3. ROI Database Logs (PostgreSQL)</h3>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>X</th>
                <th>Y</th>
                <th>Width</th>
                <th>Height</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {roiData.map((roi) => (
                <tr key={roi.id}>
                  <td>{roi.id}</td>
                  <td>{roi.x}</td>
                  <td>{roi.y}</td>
                  <td>{roi.width}</td>
                  <td>{roi.height}</td>
                  <td>{new Date(roi.timestamp).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;