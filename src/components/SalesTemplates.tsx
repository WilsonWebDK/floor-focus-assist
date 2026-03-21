import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, FileText } from "lucide-react";
import { toast } from "sonner";

interface SalesTemplate {
  id: string;
  name: string;
  content: string;
  disclaimer: string | null;
  is_active: boolean;
  created_at: string;
}

const PLACEHOLDER_HINTS = "Tilgængelige pladsholdere: {{customer_name}}, {{job_type}}, {{estimated_price}}, {{suggested_treatment}}, {{square_meters}}, {{city}}, {{floor_type}}, {{address}}";

export default function SalesTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<SalesTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("sales_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setTemplates((data as SalesTemplate[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!name.trim() || !content.trim()) {
      toast.error("Navn og indhold er påkrævet");
      return;
    }
    setSaving(true);
    if (editingId) {
      await supabase.from("sales_templates").update({ name: name.trim(), content: content.trim() } as any).eq("id", editingId);
      toast.success("Skabelon opdateret");
    } else {
      await supabase.from("sales_templates").insert({ name: name.trim(), content: content.trim(), created_by: user?.id } as any);
      toast.success("Skabelon oprettet");
    }
    setSaving(false);
    resetForm();
    load();
  };

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    // If activating, deactivate all others first
    if (!currentlyActive) {
      await supabase.from("sales_templates").update({ is_active: false } as any).neq("id", id);
    }
    await supabase.from("sales_templates").update({ is_active: !currentlyActive } as any).eq("id", id);
    load();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Slet denne skabelon?")) return;
    await supabase.from("sales_templates").delete().eq("id", id);
    toast.success("Skabelon slettet");
    load();
  };

  const startEdit = (t: SalesTemplate) => {
    setEditingId(t.id);
    setName(t.name);
    setContent(t.content);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setContent("");
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Salgsskabeloner
        </h2>
        <Button variant="outline" size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Tilføj
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div>
            <Label className="text-xs">Skabelonnavn</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="F.eks. Standard tilbud" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Indhold</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Kære {{customer_name}},\n\nTak for din henvendelse vedr. {{job_type}}..."
              rows={8}
              className="mt-1 font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground mt-1">{PLACEHOLDER_HINTS}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={resetForm}>Annuller</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Gemmer..." : editingId ? "Opdater" : "Gem"}
            </Button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Ingen skabeloner oprettet endnu.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t.id, t.is_active)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{t.content.slice(0, 80)}...</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(t)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteTemplate(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
