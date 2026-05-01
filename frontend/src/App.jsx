import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

// --- SMART URL LOGIC ---
const isLocalhost = window.location.hostname === 'localhost';
const BACKEND_HOSTNAME = isLocalhost 
  ? "localhost:8000" 
  : window.location.hostname.replace('5173', '8000');

const WS_BASE_URL = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + BACKEND_HOSTNAME;
const HTTP_BASE_URL = (window.location.protocol === 'https:' ? 'https://' : 'http://') + BACKEND_HOSTNAME;
// -----------------------

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [roiData, setRoiData] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    // 1. Connect to the Stream WebSocket (to receive processed video)
    const streamWs = new WebSocket(WS_BASE_URL + "/ws/feed/stream");
    
    streamWs.onmessage = (event) => {
      const blob = new Blob([event.data], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      if (imgRef.current) imgRef.current.src = url;
    };

    // 2. Fetch ROI Data periodically
    const fetchRoi = async () => {
      try {
        const res = await axios.get(HTTP_BASE_URL + "/api/roi/");
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
  }, []);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
        startUploading();
      }
    } catch (err) {
      console.error("Webcam blocked. Ensure you are using HTTPS and ports are PUBLIC!", err);
    }
  };

  const startUploading = () => {
    const uploadWs = new WebSocket(WS_BASE_URL + "/ws/feed/upload");
    
    uploadWs.onopen = () => {
        setInterval(() => {
          if (videoRef.current && canvasRef.current && uploadWs.readyState === WebSocket.OPEN) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
              if (blob) uploadWs.send(blob);
            }, 'image/jpeg', 0.5);
          }
        }, 150); // Send roughly 7 frames per second for stability
    };
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1>🤖 Real-Time Face Detection System</h1>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <div style={{ border: '2px solid #ccc', padding: '10px', borderRadius: '8px' }}>
          <h3>1. Raw Webcam Feed</h3>
          <video ref={videoRef} style={{ width: '400px', backgroundColor: '#000' }} muted playsInline></video>
          <br/>
          {!isStreaming && (
            <button onClick={startVideo} style={{ marginTop: '10px', padding: '10px 20px', cursor: 'pointer' }}>
              Start Camera & Send Feed
            </button>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        </div>
        <div style={{ border: '2px solid #4CAF50', padding: '10px', borderRadius: '8px' }}>
          <h3>2. Processed Feed (From Backend)</h3>
          <img ref={imgRef} style={{ width: '400px', minHeight: '300px', backgroundColor: '#333' }} alt="Waiting..." />
        </div>
      </div>
      <div style={{ border: '2px solid #008CBA', padding: '10px', borderRadius: '8px', maxWidth: '840px' }}>
        <h3>3. ROI Database Logs (PostgreSQL)</h3>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr><th>ID</th><th>X</th><th>Y</th><th>Width</th><th>Height</th><th>Time</th></tr>
            </thead>
            <tbody>
              {roiData.map((roi) => (
                <tr key={roi.id}>
                  <td>{roi.id}</td><td>{roi.x}</td><td>{roi.y}</td><td>{roi.width}</td><td>{roi.height}</td>
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