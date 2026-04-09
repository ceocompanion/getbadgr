import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, Mail, Globe, Linkedin, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ContactCard from "@/components/ContactCard";

const ContactsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ["all-contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const events = [...new Set(contacts.map((c: any) => c.event_name).filter(Boolean))];

  const filtered = contacts.filter((c: any) => {
    const matchesSearch =
      !search ||
      `${c.first_name} ${c.last_name} ${c.company} ${c.job_title}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesEvent = !eventFilter || c.event_name === eventFilter;
    return matchesSearch && matchesEvent;
  });

  const exportCsv = () => {
    const headers = ["First Name", "Last Name", "Job Title", "Company", "Email", "LinkedIn", "Website", "Notes", "Event", "Date"];
    const rows = filtered.map((c: any) => [
      c.first_name, c.last_name, c.job_title, c.company, c.email, c.linkedin_url, c.company_website, c.notes, c.event_name, c.event_date,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v: string) => `"${(v || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scanlead_contacts_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-4 space-y-4 min-h-0">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Contacts</h2>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1" />
          CSV
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>

      {events.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <button
            onClick={() => setEventFilter("")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !eventFilter ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            All
          </button>
          {events.map((e: string) => (
            <button
              key={e}
              onClick={() => setEventFilter(e === eventFilter ? "" : e)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                eventFilter === e ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <p className="text-muted-foreground text-sm">No contacts found.</p>
          </div>
        ) : (
          filtered.map((contact: any) => (
            <div key={contact.id}>
              <ContactCard
                firstName={contact.first_name || ""}
                lastName={contact.last_name || ""}
                company={contact.company || ""}
                jobTitle={contact.job_title || ""}
                createdAt={contact.created_at}
                onClick={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
              />
              {expandedId === contact.id && (
                <div className="bg-card border border-t-0 border-border rounded-b-xl px-4 pb-4 space-y-3 -mt-1">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-sm text-primary">
                      <Mail className="h-3.5 w-3.5" />
                      {contact.email}
                    </a>
                  )}
                  {contact.linkedin_url && (
                    <a href={contact.linkedin_url.startsWith("http") ? contact.linkedin_url : `https://${contact.linkedin_url}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-sm text-primary">
                      <Linkedin className="h-3.5 w-3.5" />
                      LinkedIn
                    </a>
                  )}
                  {contact.company_website && (
                    <a href={contact.company_website.startsWith("http") ? contact.company_website : `https://${contact.company_website}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-sm text-primary">
                      <Globe className="h-3.5 w-3.5" />
                      {contact.company_website}
                    </a>
                  )}
                  {contact.notes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm text-foreground">{contact.notes}</p>
                    </div>
                  )}
                  {contact.voice_transcript && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Voice Note</p>
                      <p className="text-sm text-foreground italic">{contact.voice_transcript}</p>
                    </div>
                  )}
                  {contact.event_name && (
                    <p className="text-xs text-muted-foreground">Event: {contact.event_name}</p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/contacts/${contact.id}/edit`);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit Contact
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactsPage;
