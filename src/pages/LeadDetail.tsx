import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import type { Enums } from "@/integrations/supabase/types";
import StatusBadge from "@/components/StatusBadge";
import CommunicationTimeline from "@/components/CommunicationTimeline";
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  COMM_TYPE_LABELS,
  COMM_DIRECTION_LABELS,
} from "@/lib/constants";
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
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Puzzle,
  MessageSquarePlus,
  Save,
  Trash2,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Lead = Tables<"leads">;
type CommLog = Tables<"communication_logs">;

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [commLogs, setCommLogs] = useState<CommLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead>>({});

  // New comm log form
  const [showCommForm, setShowCommForm] = useState(false);
  const [commType, setCommType] = useState<Enums<"comm_type">>("phone_call");
  const [commDirection, setCommDirection] = useState<Enums<"comm_direction">>("outbound");
  const [commSummary, setCommSummary] = useState("");

  // Follow-up date
  const [followupDate, setFollowupDate] = useState("");

  const loadData = useCallback(async () => {
    if (!id) return;
    const [leadRes, commRes] = await Promise.all([
      supabase.from("leads").select("*").eq("id", id).single(),
      supabase.from("communication_logs").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    ]);
    if (leadRes.data) {
      setLead(leadRes.data);
      setEditData(leadRes.data);
      setFollowupDate(leadRes.data.next_followup_at ? leadRes.data.next_followup_at.slice(0, 10) : "");
    }
    setCommLogs(commRes.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateStatus = async (newStatus: string) => {
    if (!id) return;
    const { error } = await supabase.from("leads").update({ status: newStatus as any }).eq("id", id);
    if (error) { toast.error("Kunne ikke opdatere status"); return; }
    setLead((prev) => prev ? { ...prev, status: newStatus as any } : prev);
    toast.success(`Status ændret til ${LEAD_STATUS_LABELS[newStatus]}`);
  };

  const saveEdits = async () => {
    if (!id) return;
    setSaving(true);
    const updates: TablesUpdate<"leads"> = {
      name: editData.name,
      phone: editData.phone,
      email: editData.email,
      address: editData.address,
      city: editData.city,
      postal_code: editData.postal_code,
      job_type: editData.job_type,
      square_meters: editData.square_meters,
      floor_type: editData.floor_type,
      treatment_preference: editData.treatment_preference,
      stairs_count: editData.stairs_count,
      doorsteps_count: editData.doorsteps_count,
      parking_info: editData.parking_info,
      elevator_info: editData.elevator_info,
      urgency_flag: editData.urgency_flag,
      complexity_flag: editData.complexity_flag,
      internal_notes: editData.internal_notes,
    };
    const { error } = await supabase.from("leads").update(updates).eq("id", id);
    if (error) { toast.error("Kunne ikke gemme"); setSaving(false); return; }
    setLead((prev) => prev ? { ...prev, ...updates } : prev);
    setEditing(false);
    setSaving(false);
    toast.success("Lead opdateret");
  };

  const updateFollowup = async (date: string) => {
    if (!id) return;
    setFollowupDate(date);
    const value = date ? new Date(date).toISOString() : null;
    const { error } = await supabase.from("leads").update({ next_followup_at: value }).eq("id", id);
    if (error) { toast.error("Kunne ikke opdatere opfølgning"); return; }
    setLead((prev) => prev ? { ...prev, next_followup_at: value } : prev);
    toast.success(date ? "Opfølgningsdato sat" : "Opfølgningsdato fjernet");
  };

  const addCommLog = async () => {
    if (!id || !commSummary.trim()) return;
    const { error } = await supabase.from("communication_logs").insert({
      lead_id: id,
      type: commType,
      direction: commDirection,
      summary: commSummary.trim(),
      created_by: user?.id,
    });
    if (error) { toast.error("Kunne ikke tilføje log"); return; }
    await supabase.from("leads").update({ last_contacted_at: new Date().toISOString() }).eq("id", id);
    setCommSummary("");
    setShowCommForm(false);
    toast.success("Kommunikation logget");
    loadData();
  };

  const deleteLead = async () => {
    if (!id || !confirm("Er du sikker på at du vil slette denne lead?")) return;
    await supabase.from("leads").delete().eq("id", id);
    toast.success("Lead slettet");
    navigate("/leads");
  };

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}</div>;
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lead ikke fundet</p>
        <Button variant="outline" onClick={() => navigate("/leads")} className="mt-4">Tilbage</Button>
      </div>
    );
  }

  const hasCalendarSync = !!lead.google_calendar_event_id;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="mt-1 p-1 rounded hover:bg-accent transition-colors active:scale-95">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{lead.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <StatusBadge status={lead.status} />
            {lead.urgency_flag && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-status-urgent">
                <AlertTriangle className="h-3 w-3" /> Haster
              </span>
            )}
            {lead.complexity_flag && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-status-warning">
                <Puzzle className="h-3 w-3" /> Kompleks
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick contact */}
      <div className="flex gap-2">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:shadow-sm hover:border-secondary transition-all active:scale-95">
            <Phone className="h-4 w-4 text-primary" />
            {lead.phone}
          </a>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:shadow-sm hover:border-secondary transition-all active:scale-95 truncate">
            <Mail className="h-4 w-4 text-primary" />
            <span className="truncate">{lead.email}</span>
          </a>
        )}
      </div>

      {/* Status pipeline */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold mb-3">Status</h2>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
            <button
              key={value}
              onClick={() => updateStatus(value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95",
                lead.status === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-secondary"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Follow-up & Calendar section */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Opfølgning & Kalender
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label className="text-xs">Næste opfølgning</Label>
            <Input
              type="date"
              value={followupDate}
              onChange={(e) => updateFollowup(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex items-end gap-2">
            {hasCalendarSync && lead.google_calendar_link && (
              <a
                href={lead.google_calendar_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-secondary bg-accent/50 px-3 py-2 text-xs font-medium text-primary hover:bg-secondary transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Åbn i kalender
              </a>
            )}
            {!hasCalendarSync && followupDate && (
              <span className="text-xs text-muted-foreground py-2">
                Kalendersynk kommer snart
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Detaljer</h2>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Rediger</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditData(lead); }}>Annuller</Button>
              <Button size="sm" onClick={saveEdits} disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1" />
                {saving ? "Gemmer..." : "Gem"}
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <EditForm editData={editData} setEditData={setEditData} />
        ) : (
          <DetailView lead={lead} />
        )}
      </div>

      {/* Missing info */}
      {lead.suggested_questions && lead.suggested_questions.length > 0 && (
        <div className="rounded-lg border border-status-warning/30 bg-status-warning/5 p-4">
          <h2 className="text-sm font-semibold mb-2">Foreslåede spørgsmål</h2>
          <ul className="space-y-1">
            {lead.suggested_questions.map((q, i) => (
              <li key={i} className="text-sm text-foreground flex gap-2">
                <span className="text-muted-foreground">{i + 1}.</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Communication log */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Kommunikation</h2>
          <Button variant="outline" size="sm" onClick={() => setShowCommForm(!showCommForm)}>
            <MessageSquarePlus className="h-3.5 w-3.5 mr-1" />
            Log
          </Button>
        </div>

        {showCommForm && (
          <div className="mb-4 p-3 rounded-lg bg-accent/40 space-y-3 animate-fade-in">
            <div className="flex gap-2">
              <Select value={commType} onValueChange={(v) => setCommType(v as any)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(COMM_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={commDirection} onValueChange={(v) => setCommDirection(v as any)}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(COMM_DIRECTION_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={commSummary}
              onChange={(e) => setCommSummary(e.target.value)}
              placeholder="Skriv resumé af samtalen..."
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCommForm(false)}>Annuller</Button>
              <Button size="sm" onClick={addCommLog} disabled={!commSummary.trim()}>Gem</Button>
            </div>
          </div>
        )}

        <CommunicationTimeline logs={commLogs} />
      </div>

      {/* Danger zone */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={deleteLead} className="text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Slet lead
        </Button>
      </div>
    </div>
  );
}

/* --- Sub-components --- */

function EditForm({ editData, setEditData }: { editData: Partial<Lead>; setEditData: (d: Partial<Lead>) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label className="text-xs">Navn</Label><Input value={editData.name ?? ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} /></div>
      <div><Label className="text-xs">Telefon</Label><Input value={editData.phone ?? ""} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} /></div>
      <div><Label className="text-xs">Email</Label><Input value={editData.email ?? ""} onChange={(e) => setEditData({ ...editData, email: e.target.value })} /></div>
      <div><Label className="text-xs">By</Label><Input value={editData.city ?? ""} onChange={(e) => setEditData({ ...editData, city: e.target.value })} /></div>
      <div><Label className="text-xs">Adresse</Label><Input value={editData.address ?? ""} onChange={(e) => setEditData({ ...editData, address: e.target.value })} /></div>
      <div><Label className="text-xs">Postnr</Label><Input value={editData.postal_code ?? ""} onChange={(e) => setEditData({ ...editData, postal_code: e.target.value })} /></div>
      <div><Label className="text-xs">Opgavetype</Label><Input value={editData.job_type ?? ""} onChange={(e) => setEditData({ ...editData, job_type: e.target.value })} /></div>
      <div><Label className="text-xs">Kvadratmeter</Label><Input type="number" value={editData.square_meters ?? ""} onChange={(e) => setEditData({ ...editData, square_meters: e.target.value ? Number(e.target.value) : null })} /></div>
      <div><Label className="text-xs">Gulvtype</Label><Input value={editData.floor_type ?? ""} onChange={(e) => setEditData({ ...editData, floor_type: e.target.value })} /></div>
      <div><Label className="text-xs">Behandling</Label><Input value={editData.treatment_preference ?? ""} onChange={(e) => setEditData({ ...editData, treatment_preference: e.target.value })} /></div>
      <div><Label className="text-xs">Antal trapper</Label><Input type="number" value={editData.stairs_count ?? 0} onChange={(e) => setEditData({ ...editData, stairs_count: Number(e.target.value) })} /></div>
      <div><Label className="text-xs">Antal dørtrin</Label><Input type="number" value={editData.doorsteps_count ?? 0} onChange={(e) => setEditData({ ...editData, doorsteps_count: Number(e.target.value) })} /></div>
      <div><Label className="text-xs">Parkering</Label><Input value={editData.parking_info ?? ""} onChange={(e) => setEditData({ ...editData, parking_info: e.target.value })} /></div>
      <div><Label className="text-xs">Elevator</Label><Input value={editData.elevator_info ?? ""} onChange={(e) => setEditData({ ...editData, elevator_info: e.target.value })} /></div>
      <div className="sm:col-span-2 flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editData.urgency_flag ?? false} onChange={(e) => setEditData({ ...editData, urgency_flag: e.target.checked })} className="rounded" />
          Haster
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editData.complexity_flag ?? false} onChange={(e) => setEditData({ ...editData, complexity_flag: e.target.checked })} className="rounded" />
          Kompleks
        </label>
      </div>
      <div className="sm:col-span-2">
        <Label className="text-xs">Interne noter</Label>
        <Textarea value={editData.internal_notes ?? ""} onChange={(e) => setEditData({ ...editData, internal_notes: e.target.value })} rows={3} />
      </div>
    </div>
  );
}

function DetailView({ lead }: { lead: Lead }) {
  return (
    <div className="space-y-3 text-sm">
      <InfoRow label="Kilde" value={LEAD_SOURCE_LABELS[lead.source] ?? lead.source} />
      {lead.address && (
        <InfoRow label="Adresse" value={
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            {[lead.address, lead.postal_code, lead.city].filter(Boolean).join(", ")}
          </span>
        } />
      )}
      {lead.job_type && <InfoRow label="Opgavetype" value={lead.job_type} />}
      {lead.square_meters && <InfoRow label="Areal" value={`${lead.square_meters} m²`} />}
      {lead.floor_type && <InfoRow label="Gulvtype" value={lead.floor_type} />}
      {lead.treatment_preference && <InfoRow label="Behandling" value={lead.treatment_preference} />}
      {(lead.stairs_count ?? 0) > 0 && <InfoRow label="Trapper" value={String(lead.stairs_count)} />}
      {(lead.doorsteps_count ?? 0) > 0 && <InfoRow label="Dørtrin" value={String(lead.doorsteps_count)} />}
      {lead.parking_info && <InfoRow label="Parkering" value={lead.parking_info} />}
      {lead.elevator_info && <InfoRow label="Elevator" value={lead.elevator_info} />}
      {lead.lead_message && (
        <div>
          <span className="text-muted-foreground">Besked:</span>
          <p className="mt-1 text-foreground whitespace-pre-wrap">{lead.lead_message}</p>
        </div>
      )}
      {lead.internal_notes && (
        <div>
          <span className="text-muted-foreground">Interne noter:</span>
          <p className="mt-1 text-foreground whitespace-pre-wrap">{lead.internal_notes}</p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
