import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, X, RotateCcw, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ScanPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch {
      toast.error("Camera not available. Use the file picker instead.");
      setUseFallback(true);
    } finally {
      setCameraStarting(false);
    }
  }, []);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const retake = () => {
    setCapturedImage(null);
    if (useFallback) {
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      startCamera();
    }
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {!capturedImage ? (
        <>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            {cameraActive ? (
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            ) : (
              <div className="flex flex-col items-center gap-6 p-8 text-center">
                {cameraStarting ? (
                  <Loader2 className="h-12 w-12 animate-spin text-primary-foreground" />
                ) : (
                  <>
                    <Video className="h-16 w-16 text-primary-foreground/60" />
                    <Button
                      variant="scan"
                      size="xl"
                      onClick={startCamera}
                      className="rounded-2xl"
                    >
                      <Camera className="h-6 w-6 mr-2" />
                      Tap to Start Camera
                    </Button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary-foreground/70 underline text-sm mt-2"
                    >
                      Or pick a photo from gallery
                    </button>
                  </>
                )}
              </div>
            )}
            {/* Hidden video for when not yet active */}
            {!cameraActive && <video ref={videoRef} className="hidden" autoPlay playsInline muted />}
          </div>

          {cameraActive && (
            <div
              className="absolute left-0 right-0 flex justify-center z-[60] pointer-events-none px-4"
              style={{ bottom: "max(2rem, calc(env(safe-area-inset-bottom) + 6rem))" }}
            >
              <button
                onClick={capturePhoto}
                onContextMenu={(e) => e.preventDefault()}
                className="h-20 w-20 rounded-full border-4 border-primary-foreground bg-primary-foreground/20 flex items-center justify-center active:scale-95 transition-transform select-none pointer-events-auto shadow-lg shadow-foreground/20"
                style={{ WebkitTouchCallout: 'none', touchAction: 'manipulation' }}
              >
                <Camera className="h-8 w-8 text-primary-foreground pointer-events-none" />
              </button>
            </div>
          )}

          {useFallback && !cameraActive && (
            <div
              className="absolute left-0 right-0 flex justify-center z-[60] px-4"
              style={{ bottom: "max(2rem, calc(env(safe-area-inset-bottom) + 6rem))" }}
            >
              <Button variant="scan" size="xl" onClick={() => fileInputRef.current?.click()}>
                <Camera className="h-6 w-6 mr-2" />
                Take Photo
              </Button>
            </div>
          )}
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
