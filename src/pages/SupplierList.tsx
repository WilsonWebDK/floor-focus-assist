import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Phone, Mail, MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Supplier = Tables<"suppliers">;

const SCORE_FIELDS = [
  { key: "score_floor_sanding", label: "Gulvslibning" },
  { key: "score_floor_laying", label: "Gulvlægning" },
  { key: "score_surface_treatment", label: "Overfladebehandling" },
  { key: "score_terrace", label: "Terrasse" },
  { key: "score_danish_language", label: "Dansk sprog" },
  { key: "score_reliability", label: "Pålidelighed" },
] as const;

type ScoreKey = typeof SCORE_FIELDS[number]["key"];

interface FormState {
  name: string;
  phone: string;
  email: string;
  skills: string;
  cities_served: string;
  can_do_carpentry: boolean;
  speaks_good_danish: boolean;
  general_notes: string;
  reliability_notes: string;
  capacity_notes: string;
  score_floor_sanding: number;
  score_floor_laying: number;
  score_surface_treatment: number;
  score_terrace: number;
  score_danish_language: number;
  score_reliability: number;
}

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  email: "",
  skills: "",
  cities_served: "",
  can_do_carpentry: false,
  speaks_good_danish: true,
  general_notes: "",
  reliability_notes: "",
  capacity_notes: "",
  score_floor_sanding: 5,
  score_floor_laying: 5,
  score_surface_treatment: 5,
  score_terrace: 5,
  score_danish_language: 5,
  score_reliability: 5,
};

function toForm(s: Supplier): FormState {
  return {
    name: s.name,
    phone: s.phone ?? "",
    email: s.email ?? "",
    skills: (s.skills ?? []).join(", "),
    cities_served: (s.cities_served ?? []).join(", "),
    can_do_carpentry: s.can_do_carpentry ?? false,
    speaks_good_danish: s.speaks_good_danish ?? true,
    general_notes: s.general_notes ?? "",
    reliability_notes: s.reliability_notes ?? "",
    capacity_notes: s.capacity_notes ?? "",
    score_floor_sanding: s.score_floor_sanding ?? 5,
    score_floor_laying: s.score_floor_laying ?? 5,
    score_surface_treatment: s.score_surface_treatment ?? 5,
    score_terrace: s.score_terrace ?? 5,
    score_danish_language: s.score_danish_language ?? 5,
    score_reliability: s.score_reliability ?? 5,
  };
}

function splitList(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function avgScore(s: Supplier): number {
  const scores = SCORE_FIELDS.map((f) => (s[f.key] as number) ?? 5);
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

export default function SupplierList() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm(toForm(s));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Navn er påkrævet"); return; }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      skills: splitList(form.skills),
      cities_served: splitList(form.cities_served),
      can_do_carpentry: form.can_do_carpentry,
      speaks_good_danish: form.speaks_good_danish,
      general_notes: form.general_notes || null,
      reliability_notes: form.reliability_notes || null,
      capacity_notes: form.capacity_notes || null,
      score_floor_sanding: form.score_floor_sanding,
      score_floor_laying: form.score_floor_laying,
      score_surface_treatment: form.score_surface_treatment,
      score_terrace: form.score_terrace,
      score_danish_language: form.score_danish_language,
      score_reliability: form.score_reliability,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("suppliers").update(payload as TablesUpdate<"suppliers">).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("suppliers").insert({ ...payload, created_by: user?.id } as TablesInsert<"suppliers">));
    }

    setSaving(false);
    if (error) { toast.error("Kunne ikke gemme leverandør"); return; }
    toast.success(editingId ? "Leverandør opdateret" : "Leverandør oprettet");
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette denne leverandør?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) { toast.error("Kunne ikke slette"); return; }
    toast.success("Leverandør slettet");
    load();
  };

  const set = (key: keyof FormState, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Leverandører</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Tilføj
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : suppliers.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Ingen leverandører tilføjet endnu</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Tilføj den første
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <div key={s.id} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  {s.skills && s.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.skills.map((skill) => (
                        <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5 mr-1">
                    Gns: {avgScore(s)}/10
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {s.phone && (
                  <a href={`tel:${s.phone}`} className="flex items-center gap-1 hover:text-foreground">
                    <Phone className="h-3 w-3" /> {s.phone}
                  </a>
                )}
                {s.email && (
                  <a href={`mailto:${s.email}`} className="flex items-center gap-1 hover:text-foreground">
                    <Mail className="h-3 w-3" /> {s.email}
                  </a>
                )}
                {s.cities_served && s.cities_served.length > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {s.cities_served.join(", ")}
                  </span>
                )}
              </div>
              {/* Score badges */}
              <div className="flex flex-wrap gap-1.5">
                {SCORE_FIELDS.map((f) => (
                  <span key={f.key} className="text-[10px] rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
                    {f.label}: {(s[f.key] as number) ?? 5}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Rediger leverandør" : "Ny leverandør"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Opdater leverandørens oplysninger." : "Udfyld oplysninger om den nye leverandør."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">Navn *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Telefon</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} type="tel" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={form.email} onChange={(e) => set("email", e.target.value)} type="email" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Kompetencer (kommasepareret)</Label>
              <Input value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="Slibning, lakering, nyanlæg..." />
            </div>
            <div>
              <Label className="text-xs">Byer (kommasepareret)</Label>
              <Input value={form.cities_served} onChange={(e) => set("cities_served", e.target.value)} placeholder="København, Aarhus..." />
            </div>

            {/* Score sliders */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vurderinger (1-10)</p>
              {SCORE_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{f.label}</Label>
                    <span className="text-xs font-medium tabular-nums">{form[f.key]}/10</span>
                  </div>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[form[f.key]]}
                    onValueChange={([v]) => set(f.key, v)}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.can_do_carpentry} onCheckedChange={(v) => set("can_do_carpentry", v)} />
                Snedkerarbejde
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.speaks_good_danish} onCheckedChange={(v) => set("speaks_good_danish", v)} />
                Godt dansk
              </label>
            </div>
            <div>
              <Label className="text-xs">Kapacitetsnoter</Label>
              <Textarea value={form.capacity_notes} onChange={(e) => set("capacity_notes", e.target.value)} rows={2} placeholder="Nuværende kapacitet, bemanding..." />
            </div>
            <div>
              <Label className="text-xs">Generelle noter</Label>
              <Textarea value={form.general_notes} onChange={(e) => set("general_notes", e.target.value)} rows={2} />
            </div>
            <div>
              <Label className="text-xs">Pålidelighed</Label>
              <Textarea value={form.reliability_notes} onChange={(e) => set("reliability_notes", e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuller</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Gemmer..." : editingId ? "Opdater" : "Opret"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
