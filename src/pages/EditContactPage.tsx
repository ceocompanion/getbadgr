import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Check, ArrowLeft, Search, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const EditContactPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    job_title: "",
    company: "",
    email: "",
    linkedin_url: "",
    company_website: "",
    notes: "",
  });

  const [suggestions, setSuggestions] = useState<{
    email?: string;
    email_confidence?: string;
    linkedin_url?: string;
    linkedin_confidence?: string;
    company_website?: string;
  } | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (error || !data) {
        toast.error("Contact not found");
        navigate("/contacts");
        return;
      }
      setForm({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        job_title: data.job_title || "",
        company: data.company || "",
        email: data.email || "",
        linkedin_url: data.linkedin_url || "",
        company_website: data.company_website || "",
        notes: data.notes || "",
      });
      setLoading(false);
    })();
  }, [user, id]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setSuggestions(null);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-contact", {
        body: {
          first_name: form.first_name,
          last_name: form.last_name,
          company: form.company,
          job_title: form.job_title,
        },
      });
      if (error) throw error;
      setSuggestions(data);
    } catch (err: any) {
      toast.error(err.message || "Enrichment failed");
    } finally {
      setEnriching(false);
    }
  };

  const acceptSuggestion = (field: string, value: string) => {
    updateField(field, value);
    setSuggestions((prev) => (prev ? { ...prev, [field]: undefined } : null));
    toast.success(`${field === "email" ? "Email" : field === "linkedin_url" ? "LinkedIn" : "Website"} updated`);
  };

  const handleSave = async () => {
    if (!user || !id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("contacts")
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          job_title: form.job_title,
          company: form.company,
          email: form.email,
          linkedin_url: form.linkedin_url,
          company_website: form.company_website,
          notes: form.notes,
        })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Contact updated!");
      navigate("/contacts");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const fields = [
    { key: "first_name", label: "First Name", placeholder: "John" },
    { key: "last_name", label: "Last Name", placeholder: "Doe" },
    { key: "job_title", label: "Job Title", placeholder: "Product Manager" },
    { key: "company", label: "Company", placeholder: "Acme Inc" },
    { key: "email", label: "Email", placeholder: "john.doe@acme.com", enrichable: true },
    { key: "linkedin_url", label: "LinkedIn URL", placeholder: "linkedin.com/in/johndoe", enrichable: true },
    { key: "company_website", label: "Company Website", placeholder: "acme.com", enrichable: true },
  ];

  const confidenceColor = (c?: string) =>
    c === "high" ? "text-green-600" : c === "medium" ? "text-yellow-600" : "text-muted-foreground";

  return (
    <div className="flex-1 px-4 py-4 pb-4 space-y-4 overflow-y-auto min-h-0">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground">Edit Contact</h2>
      </div>

      {/* AI Enrichment button */}
      <Button
        variant="outline"
        className="w-full h-12"
        onClick={handleEnrich}
        disabled={enriching || (!form.first_name && !form.last_name && !form.company)}
      >
        {enriching ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            🔍 Find email & LinkedIn with AI
          </>
        )}
      </Button>

      {fields.map(({ key, label, placeholder, enrichable }) => (
        <div key={key} className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">{label}</label>
          <Input
            value={(form as any)[key]}
            onChange={(e) => updateField(key, e.target.value)}
            placeholder={placeholder}
            className="h-12 text-base"
          />
          {/* AI suggestion */}
          {enrichable && suggestions && (suggestions as any)[key] && (
            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 mt-1">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{(suggestions as any)[key]}</p>
                <p className={`text-xs ${confidenceColor((suggestions as any)[`${key === "email" ? "email" : key === "linkedin_url" ? "linkedin" : ""}_confidence`])}`}>
                  {(suggestions as any)[`${key === "email" ? "email" : key === "linkedin_url" ? "linkedin" : ""}_confidence`]
                    ? `${(suggestions as any)[`${key === "email" ? "email" : key === "linkedin_url" ? "linkedin" : ""}_confidence`]} confidence`
                    : "AI suggestion"}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => acceptSuggestion(key, (suggestions as any)[key])}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Accept
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-muted-foreground">Notes</label>
        <Textarea
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Additional notes..."
          className="min-h-[80px] text-base"
        />
      </div>

      {/* Save */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1 h-14"
          onClick={() => navigate("/contacts")}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button className="flex-1 h-14" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default EditContactPage;
