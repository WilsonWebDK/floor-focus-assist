import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { MessageSquarePlus, Search, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function QuickNoteButton() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"current" | "search" | "new">("current");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [newLeadName, setNewLeadName] = useState("");

  // Detect if on a lead page
  const leadMatch = location.pathname.match(/^\/leads\/([a-f0-9-]+)$/);
  const currentLeadId = leadMatch?.[1] || null;

  useEffect(() => {
    if (open) {
      setNote("");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedLeadId(null);
      setNewLeadName("");
      setMode(currentLeadId ? "current" : "search");
    }
  }, [open, currentLeadId]);

  const searchLeads = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from("leads")
      .select("id, name")
      .ilike("name", `%${q}%`)
      .limit(5);
    setSearchResults(data ?? []);
  };

  const save = async () => {
    if (!note.trim()) { toast.error("Skriv en note"); return; }
    setSaving(true);

    let leadId = currentLeadId || selectedLeadId;

    // Create new lead if needed
    if (mode === "new") {
      if (!newLeadName.trim()) { toast.error("Navn er påkrævet"); setSaving(false); return; }
      const { data, error } = await supabase.from("leads").insert({
        name: newLeadName.trim(),
        source: "phone" as any,
        created_by: user?.id,
        internal_notes: note.trim(),
      } as any).select("id").single();
      if (error) { toast.error("Kunne ikke oprette lead"); setSaving(false); return; }
      leadId = data.id;
    }

    if (!leadId) { toast.error("Vælg et lead"); setSaving(false); return; }

    // Save communication log
    const { error } = await supabase.from("communication_logs").insert({
      lead_id: leadId,
      type: "note" as any,
      direction: "internal" as any,
      summary: note.trim(),
      created_by: user?.id,
    });

    setSaving(false);
    if (error) { toast.error("Kunne ikke gemme note"); return; }
    toast.success(mode === "new" ? "Lead oprettet med note" : "Note gemt");
    setOpen(false);
  };

  if (!isMobile) return null;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="fixed bottom-20 right-4 z-50 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg h-12 w-12 active:scale-95 transition-transform">
          <MessageSquarePlus className="h-5 w-5" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="px-4 pb-6">
        <DrawerHeader className="px-0">
          <DrawerTitle>Hurtig note</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Skriv note..."
            rows={3}
            autoFocus
          />

          {currentLeadId ? (
            <p className="text-xs text-muted-foreground">Tilknyttes nuværende lead</p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setMode("search")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${mode === "search" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  Vælg lead
                </button>
                <button
                  onClick={() => setMode("new")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${mode === "new" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  Nyt lead
                </button>
              </div>

              {mode === "search" && (
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => searchLeads(e.target.value)}
                      placeholder="Søg lead..."
                      className="pl-8 h-9"
                    />
                  </div>
                  {searchResults.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => { setSelectedLeadId(l.id); setSearchQuery(l.name); setSearchResults([]); }}
                      className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                    >
                      {l.name}
                    </button>
                  ))}
                  {selectedLeadId && (
                    <p className="text-xs text-primary">Valgt: {searchQuery}</p>
                  )}
                </div>
              )}

              {mode === "new" && (
                <div>
                  <Label className="text-xs">Leadnavn *</Label>
                  <Input value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} placeholder="Kundens navn" className="mt-1" />
                </div>
              )}
            </div>
          )}

          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            {saving ? "Gemmer..." : "Gem note"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
