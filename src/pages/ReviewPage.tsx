import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mic, MicOff, Loader2, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";
import { toast } from "sonner";

const ReviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { eventName } = useCurrentEvent();

  const { extractedData, badgeImage } = (location.state as any) || {};

  const [form, setForm] = useState({
    first_name: extractedData?.first_name || "",
    last_name: extractedData?.last_name || "",
    job_title: extractedData?.job_title || "",
    company: extractedData?.company_name || extractedData?.company || "",
    email: extractedData?.email_guess || extractedData?.email || "",
    linkedin_url: extractedData?.linkedin_url || "",
    company_website: extractedData?.company_website || "",
    notes: "",
  });

  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      let badgePhotoUrl = "";
      let voiceNoteUrl: string | null = null;
      let voiceTranscript: string | null = null;

      // Upload badge photo
      if (badgeImage) {
        const base64 = badgeImage.split(",")[1];
        const fileName = `${user.id}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}_badge.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("badge-photos")
          .upload(fileName, Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)), {
            contentType: "image/jpeg",
          });
        if (!uploadError) {
          // Store the file path, not a public URL (bucket is private)
          badgePhotoUrl = fileName;
        }
      }

      // Upload voice note & transcribe
      if (audioBlob) {
        const fileName = `${user.id}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}_voice.webm`;
        const { error: uploadError } = await supabase.storage
          .from("voice-notes")
          .upload(fileName, audioBlob, { contentType: "audio/webm" });
        if (!uploadError) {
          // Store the file path, not a public URL (bucket is private)
          voiceNoteUrl = fileName;

          // Transcribe using a signed URL
          try {
            const { data: signedUrlData } = await supabase.storage.from("voice-notes").createSignedUrl(fileName, 300);
            const { data: transcriptData } = await supabase.functions.invoke("transcribe", {
              body: { audioUrl: signedUrlData?.signedUrl },
            });
            voiceTranscript = transcriptData?.transcript || null;
          } catch {
            // Non-blocking
          }
        }
      }

      const { error } = await supabase.from("contacts").insert({
        user_id: user.id,
        first_name: form.first_name,
        last_name: form.last_name,
        job_title: form.job_title,
        company: form.company,
        email: form.email,
        linkedin_url: form.linkedin_url,
        company_website: form.company_website,
        notes: form.notes,
        badge_photo_url: badgePhotoUrl,
        voice_note_url: voiceNoteUrl,
        voice_transcript: voiceTranscript,
        event_name: eventName,
        event_date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;
      toast.success("Contact saved!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: "first_name", label: "First Name", placeholder: "John" },
    { key: "last_name", label: "Last Name", placeholder: "Doe" },
    { key: "job_title", label: "Job Title", placeholder: "Product Manager" },
    { key: "company", label: "Company", placeholder: "Acme Inc" },
    { key: "email", label: "Email", placeholder: "john.doe@acme.com" },
    { key: "linkedin_url", label: "LinkedIn URL", placeholder: "linkedin.com/in/johndoe" },
    { key: "company_website", label: "Company Website", placeholder: "acme.com" },
  ];

  return (
    <div className="flex-1 px-4 py-4 pb-24 space-y-4 overflow-y-auto">
      <h2 className="text-lg font-semibold text-foreground">Review Contact</h2>

      {fields.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">{label}</label>
          <Input
            value={(form as any)[key]}
            onChange={(e) => updateField(key, e.target.value)}
            placeholder={placeholder}
            className="h-12 text-base"
          />
        </div>
      ))}

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-muted-foreground">Notes</label>
        <Textarea
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Met at the keynote, interested in our API..."
          className="min-h-[80px] text-base"
        />
      </div>

      {/* Voice Note */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Voice Note</label>
        <div className="flex items-center gap-3">
          <Button
            variant={recording ? "destructive" : "outline"}
            className="h-12 flex-1"
            onClick={recording ? stopRecording : startRecording}
          >
            {recording ? (
              <>
                <MicOff className="h-4 w-4 mr-2" />
                Stop ({formatTime(recordingTime)})
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                {audioBlob ? "Re-record" : "Record Voice Note"}
              </>
            )}
          </Button>
          {audioBlob && !recording && (
            <span className="text-sm text-success font-medium">✓ Recorded</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1 h-14"
          onClick={() => navigate("/")}
          disabled={saving}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Discard
        </Button>
        <Button
          className="flex-1 h-14"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Confirm & Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ReviewPage;
