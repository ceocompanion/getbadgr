import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, X, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ScanPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      toast.error("Could not access camera. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const processImage = async () => {
    if (!capturedImage) return;
    setProcessing(true);

    try {
      const base64 = capturedImage.split(",")[1];
      const { data, error } = await supabase.functions.invoke("scan-badge", {
        body: { image: base64 },
      });
      if (error) throw error;

      navigate("/review", { state: { extractedData: data, badgeImage: capturedImage } });
    } catch (err: any) {
      toast.error(err.message || "Failed to process badge");
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-foreground/95 relative">
      <div className="absolute top-4 left-4 z-10">
        <button onClick={() => navigate("/")} className="p-2 rounded-full bg-foreground/50 text-primary-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {!capturedImage ? (
        <>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
              </div>
            )}
          </div>
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-[60] pointer-events-none">
            <button
              onClick={capturePhoto}
              onContextMenu={(e) => e.preventDefault()}
              disabled={!cameraActive}
              className="h-20 w-20 rounded-full border-4 border-primary-foreground bg-primary-foreground/20 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 select-none pointer-events-auto"
              style={{ WebkitTouchCallout: 'none', touchAction: 'manipulation' }}
            >
              <Camera className="h-8 w-8 text-primary-foreground pointer-events-none" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={capturedImage} alt="Captured badge" className="max-w-full max-h-full rounded-xl object-contain" />
          </div>
          <div className="p-4 pb-8 flex gap-3">
            <Button variant="outline" className="flex-1 h-14 bg-card" onClick={retake} disabled={processing}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button className="flex-1 h-14" onClick={processImage} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Use Photo"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ScanPage;
