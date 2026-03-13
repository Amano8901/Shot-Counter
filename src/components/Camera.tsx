import React, { useRef, useState, useCallback } from 'react';
import { Camera as CameraIcon, RefreshCw, X } from 'lucide-react';

interface CameraProps {
  onCapture: (base64Image: string) => void;
  onClose: () => void;
}

export const Camera: React.FC<CameraProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
        setError(null);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please ensure you have granted permission.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsActive(false);
    }
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onCapture(dataUrl);
        stopCamera();
      }
    }
  };

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <div className="relative w-full h-full max-w-2xl bg-zinc-900 overflow-hidden sm:rounded-2xl shadow-2xl">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-white text-black rounded-full font-medium"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            
            <div className="absolute top-4 right-4">
              <button 
                onClick={onClose}
                className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="absolute bottom-12 inset-x-0 flex justify-center items-center gap-8">
              <button 
                onClick={capturePhoto}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform border-4 border-zinc-300"
              >
                <div className="w-16 h-16 rounded-full border-2 border-zinc-800" />
              </button>
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>
    </div>
  );
};
