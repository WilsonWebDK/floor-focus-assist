import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquarePlus, Search, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function QuickNoteButton() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Note tab state
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // New lead tab state
  const [qlName, setQlName] = useState("");
  const [qlPhone, setQlPhone] = useState("");
  const [qlSaving, setQlSaving] = useState(false);

  const leadMatch = location.pathname.match(/^\/leads\/([a-f0-9-]+)$/);
  const currentLeadId = leadMatch?.[1] || null;

  useEffect(() => {
    if (open) {
      setNote("");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedLeadId(null);
      setQlName("");
      setQlPhone("");
    }
  }, [open]);

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

  const saveNote = async () => {
    if (!note.trim()) { toast.error("Skriv en note"); return; }
    const leadId = currentLeadId || selectedLeadId;
    if (!leadId) { toast.error("Vælg et lead"); return; }
    setSaving(true);
    const { error } = await supabase.from("communication_logs").insert({
      lead_id: leadId,
      type: "note" as any,
      direction: "internal" as any,
      summary: note.trim(),
      created_by: user?.id,
    });
    setSaving(false);
    if (error) { toast.error("Kunne ikke gemme note"); return; }
    toast.success("Note gemt");
    setOpen(false);
  };

  const createLead = async () => {
    if (!qlName.trim()) { toast.error("Navn er påkrævet"); return; }
    setQlSaving(true);
    const { data, error } = await supabase.from("leads").insert({
      name: qlName.trim(),
      phone: qlPhone || null,
      source: "phone" as any,
      created_by: user?.id,
    } as any).select("id").single();
    setQlSaving(false);
    if (error) { toast.error("Kunne ikke oprette lead"); return; }
    toast.success("Lead oprettet");
    setOpen(false);
    if (data?.id) navigate(`/leads/${data.id}`);
  };

  if (!isMobile) return null;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="fixed bottom-20 right-4 z-50 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg h-11 w-11 active:scale-95 transition-transform">
          <Plus className="h-5 w-5" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="px-3 pb-4">
        <DrawerHeader className="px-0 py-2">
          <DrawerTitle className="text-sm">Hurtig handling</DrawerTitle>
        </DrawerHeader>
        <Tabs defaultValue={currentLeadId ? "note" : "lead"}>
          <TabsList className="w-full mb-2">
            <TabsTrigger value="note" className="flex-1 text-xs">Note</TabsTrigger>
            <TabsTrigger value="lead" className="flex-1 text-xs">Nyt lead</TabsTrigger>
          </TabsList>

          <TabsContent value="note" className="space-y-2 mt-0">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Skriv note..."
              rows={2}
              className="text-sm"
              autoFocus
            />
            {currentLeadId ? (
              <p className="text-[11px] text-muted-foreground">Tilknyttes nuværende lead</p>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => searchLeads(e.target.value)}
                    placeholder="Søg lead..."
                    className="pl-7 h-8 text-sm"
                  />
                </div>
                {searchResults.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setSelectedLeadId(l.id); setSearchQuery(l.name); setSearchResults([]); }}
                    className="block w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                  >
                    {l.name}
                  </button>
                ))}
                {selectedLeadId && <p className="text-[11px] text-primary">Valgt: {searchQuery}</p>}
              </div>
            )}
            <Button className="w-full h-8 text-xs" onClick={saveNote} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
              {saving ? "Gemmer..." : "Gem note"}
            </Button>
          </TabsContent>

          <TabsContent value="lead" className="space-y-2 mt-0">
            <div>
              <Label className="text-[11px]">Navn *</Label>
              <Input value={qlName} onChange={(e) => setQlName(e.target.value)} className="h-8 text-sm mt-0.5" autoFocus />
            </div>
            <div>
              <Label className="text-[11px]">Telefon</Label>
              <Input value={qlPhone} onChange={(e) => setQlPhone(e.target.value)} type="tel" className="h-8 text-sm mt-0.5" />
            </div>
            <Button className="w-full h-8 text-xs" onClick={createLead} disabled={qlSaving}>
              {qlSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
              {qlSaving ? "Opretter..." : "Opret lead"}
            </Button>
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}
