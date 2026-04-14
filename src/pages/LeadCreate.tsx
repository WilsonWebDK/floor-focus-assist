import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_SOURCE_LABELS, PARKING_STATUS_LABELS } from "@/lib/constants";
import { isValidDanishPostalCode, getRegionFromPostalCode } from "@/lib/postalCodes";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Enums } from "@/integrations/supabase/types";

export default function LeadCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    postal_code: "",
    source: "manual" as Enums<"lead_source">,
    job_type: "",
    square_meters: "",
    floor_type: "",
    treatment_preference: "",
    lead_message: "",
    urgency_flag: false,
    floor_level: "0",
    has_elevator: false,
    parking_status: "unknown",
    floor_separation_type: "",
    doorsteps_count: "0",
    stairs_count: "0",
    power_13a_available: false,
    floor_history: "",
    desired_look: "",
    urgency_status: "",
    quality_expectation: "",
    time_requirement: "",
  });

  const [postalError, setPostalError] = useState("");
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null);

  const set = (key: string, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "postal_code") {
      const code = String(value).trim();
      if (code.length === 0) {
        setPostalError("");
        setDetectedRegion(null);
      } else if (code.length === 4) {
        if (isValidDanishPostalCode(code)) {
          setPostalError("");
          setDetectedRegion(getRegionFromPostalCode(code));
        } else {
          setPostalError("Ugyldigt dansk postnummer");
          setDetectedRegion(null);
        }
      } else {
        setPostalError("");
        setDetectedRegion(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Navn er påkrævet"); return; }
    if (form.postal_code && !isValidDanishPostalCode(form.postal_code)) {
      toast.error("Ugyldigt dansk postnummer (4 cifre)");
      return;
    }
    setSaving(true);

    const region = form.postal_code ? getRegionFromPostalCode(form.postal_code) : null;

    const { error } = await supabase.from("leads").insert({
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      postal_code: form.postal_code || null,
      source: form.source,
      job_type: form.job_type || null,
      square_meters: form.square_meters ? Number(form.square_meters) : null,
      floor_type: form.floor_type || null,
      treatment_preference: form.treatment_preference || null,
      lead_message: form.lead_message || null,
      urgency_flag: form.urgency_flag,
      created_by: user?.id,
      floor_level: Number(form.floor_level) || 0,
      has_elevator: form.has_elevator,
      parking_status: form.parking_status as any,
      floor_separation_type: form.floor_separation_type || null,
      doorsteps_count: Number(form.doorsteps_count) || 0,
      stairs_count: Number(form.stairs_count) || 0,
      category: region,
    } as any);

    if (error) {
      toast.error("Kunne ikke oprette lead");
      setSaving(false);
      return;
    }

    const { data: newLeads } = await supabase
      .from("leads")
      .select("id")
      .eq("name", form.name.trim())
      .eq("created_by", user?.id ?? "")
      .order("created_at", { ascending: false })
      .limit(1);

    if (newLeads?.[0]?.id) {
      const createdLead = newLeads[0];
      supabase.functions.invoke("analyze-lead", {
        body: { lead_id: createdLead.id },
      }).catch((err) => console.error("Auto-analyze failed:", err));

      supabase.functions.invoke("fire-webhook", {
        body: { event_type: "lead_created", payload: { id: createdLead.id, name: form.name.trim(), source: form.source } },
      }).catch((err) => console.error("Webhook fire failed:", err));
    }

    toast.success("Lead oprettet — AI analyserer...");
    navigate("/leads");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-accent transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Ny lead</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">Kontaktoplysninger</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Navn *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} type="tel" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} type="email" />
            </div>
            <div>
              <Label className="text-xs">Kilde</Label>
              <Select value={form.source} onValueChange={(v) => set("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_SOURCE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">Adresse</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Adresse</Label>
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Postnummer (4 cifre)</Label>
              <Input
                value={form.postal_code}
                onChange={(e) => set("postal_code", e.target.value)}
                maxLength={4}
                inputMode="numeric"
                pattern="\d{4}"
              />
              {postalError && <p className="text-xs text-destructive mt-1">{postalError}</p>}
              {detectedRegion && <p className="text-xs text-muted-foreground mt-1">Region: {detectedRegion}</p>}
            </div>
            <div>
              <Label className="text-xs">By</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">Opgave</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Opgavetype</Label>
              <Input value={form.job_type} onChange={(e) => set("job_type", e.target.value)} placeholder="Gulvafslibning, installation..." />
            </div>
            <div>
              <Label className="text-xs">Kvadratmeter</Label>
              <Input value={form.square_meters} onChange={(e) => set("square_meters", e.target.value)} type="number" />
            </div>
            <div>
              <Label className="text-xs">Gulvtype</Label>
              <Input value={form.floor_type} onChange={(e) => set("floor_type", e.target.value)} placeholder="Eg, bøg, fyr..." />
            </div>
            <div>
              <Label className="text-xs">Ønsket behandling</Label>
              <Input value={form.treatment_preference} onChange={(e) => set("treatment_preference", e.target.value)} placeholder="Lak, olie, sæbe..." />
            </div>
          </div>
          <div>
            <Label className="text-xs">Besked fra kunden</Label>
            <Textarea value={form.lead_message} onChange={(e) => set("lead_message", e.target.value)} rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.urgency_flag} onChange={(e) => set("urgency_flag", e.target.checked)} className="rounded" />
            Markér som hastende
          </label>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">Tekniske detaljer</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Etage</Label>
              <Input value={form.floor_level} onChange={(e) => set("floor_level", e.target.value)} type="number" min="0" />
            </div>
            <div>
              <Label className="text-xs">Etageadskillelse</Label>
              <Input value={form.floor_separation_type} onChange={(e) => set("floor_separation_type", e.target.value)} placeholder="Beton, træ..." />
            </div>
            <div>
              <Label className="text-xs">Antal trapper</Label>
              <Input value={form.stairs_count} onChange={(e) => set("stairs_count", e.target.value)} type="number" min="0" />
            </div>
            <div>
              <Label className="text-xs">Antal dørtrin</Label>
              <Input value={form.doorsteps_count} onChange={(e) => set("doorsteps_count", e.target.value)} type="number" min="0" />
            </div>
            <div>
              <Label className="text-xs">Parkeringsstatus</Label>
              <Select value={form.parking_status} onValueChange={(v) => set("parking_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PARKING_STATUS_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm pb-2">
                <input type="checkbox" checked={form.has_elevator} onChange={(e) => set("has_elevator", e.target.checked)} className="rounded" />
                Elevator tilgængelig
              </label>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Opretter..." : "Opret lead"}
        </Button>
      </form>
    </div>
  );
}
