import { useNavigate } from "react-router-dom";
import { Camera, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";
import { useAuth } from "@/hooks/useAuth";
import ContactCard from "@/components/ContactCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { eventName, setEventName } = useCurrentEvent();
  const { user } = useAuth();

  const { data: recentContacts = [] } = useQuery({
    queryKey: ["recent-contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="flex-1 px-4 py-6 pb-24 space-y-6">
      {/* Scan Button */}
      <div className="flex flex-col items-center pt-4">
        <Button
          variant="scan"
          size="xl"
          className="w-full max-w-xs rounded-2xl h-20"
          onClick={() => navigate("/scan")}
        >
          <Camera className="h-6 w-6 mr-2" />
          Scan Badge
        </Button>
      </div>

      {/* Current Event */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="h-4 w-4" />
          Current Event
        </label>
        <Input
          placeholder="e.g. Web Summit 2026"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          className="h-12 text-base"
        />
      </div>

      {/* Recent Contacts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Recent Scans</h2>
          {recentContacts.length > 0 && (
            <button
              onClick={() => navigate("/contacts")}
              className="text-sm text-primary font-medium"
            >
              View all
            </button>
          )}
        </div>

        {recentContacts.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No contacts scanned yet. Tap "Scan Badge" to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentContacts.map((contact: any) => (
              <ContactCard
                key={contact.id}
                firstName={contact.first_name || ""}
                lastName={contact.last_name || ""}
                company={contact.company || ""}
                jobTitle={contact.job_title || ""}
                createdAt={contact.created_at}
                onClick={() => navigate(`/contacts/${contact.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
