import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import type { Enums } from "@/integrations/supabase/types";
import StatusBadge from "@/components/StatusBadge";
import CommunicationTimeline from "@/components/CommunicationTimeline";
import LeadAiPanel from "@/components/LeadAiPanel";
import MissingInfoChecklist from "@/components/MissingInfoChecklist";
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  COMM_TYPE_LABELS,
  COMM_DIRECTION_LABELS,
  PARKING_STATUS_LABELS,
} from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  PhoneCall,
  Users,
  DollarSign,
  Send,
  FileText,
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
  const isAdmin = useIsAdmin();
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

  // One-click call log
  const [callLogId, setCallLogId] = useState<string | null>(null);
  const [callNote, setCallNote] = useState("");
  const [callFollowup, setCallFollowup] = useState("");
  const [savingCallNote, setSavingCallNote] = useState(false);

  // Economic fields
  const [editRevenue, setEditRevenue] = useState("");
  const [editCosts, setEditCosts] = useState("");
  const [savingEcon, setSavingEcon] = useState(false);

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
      setEditRevenue(leadRes.data.revenue != null ? String(leadRes.data.revenue) : "");
      setEditCosts(leadRes.data.actual_costs != null ? String(leadRes.data.actual_costs) : "");
    }
    setCommLogs(commRes.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateStatus = async (newStatus: string) => {
    if (!id || !lead) return;
    const oldStatus = lead.status;
    const { error } = await supabase.from("leads").update({ status: newStatus as any }).eq("id", id);
    if (error) { toast.error("Kunne ikke opdatere status"); return; }
    setLead((prev) => prev ? { ...prev, status: newStatus as any } : prev);
    toast.success(`Status ændret til ${LEAD_STATUS_LABELS[newStatus]}`);

    if (newStatus === "won") {
      const { data: updated } = await supabase.from("leads").select("customer_id").eq("id", id).maybeSingle();
      if (updated?.customer_id) {
        setLead((prev) => prev ? { ...prev, customer_id: updated.customer_id } : prev);
        toast.success("Kunde oprettet automatisk!", { duration: 5000 });
      }
    }

    const eventType = newStatus === "won" ? "lead_won" : "status_changed";
    supabase.functions.invoke("fire-webhook", {
      body: { event_type: eventType, payload: { ...lead, status: newStatus, previous_status: oldStatus } },
    }).catch((err) => console.error("Webhook fire failed:", err));
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
      floor_level: (editData as any).floor_level,
      has_elevator: (editData as any).has_elevator,
      parking_status: (editData as any).parking_status,
      floor_separation_type: (editData as any).floor_separation_type,
      urgency_flag: editData.urgency_flag,
      complexity_flag: editData.complexity_flag,
      internal_notes: editData.internal_notes,
    } as any;
    // New technical fields
    (updates as any).power_13a_available = (editData as any).power_13a_available;
    (updates as any).floor_history = (editData as any).floor_history;
    (updates as any).desired_look = (editData as any).desired_look;
    (updates as any).urgency_status = (editData as any).urgency_status;
    (updates as any).quality_expectation = (editData as any).quality_expectation;
    (updates as any).time_requirement = (editData as any).time_requirement;
    const { error } = await supabase.from("leads").update(updates).eq("id", id);
    if (error) { toast.error("Kunne ikke gemme"); setSaving(false); return; }
    setLead((prev) => prev ? { ...prev, ...updates } : prev);
    setEditing(false);
    setSaving(false);
    toast.success("Lead opdateret");
  };

  const saveEconomics = async () => {
    if (!id) return;
    setSavingEcon(true);
    const revenue = editRevenue ? Number(editRevenue) : null;
    const actual_costs = editCosts ? Number(editCosts) : null;
    const { error } = await supabase.from("leads").update({ revenue, actual_costs }).eq("id", id);
    if (error) { toast.error("Kunne ikke gemme økonomi"); setSavingEcon(false); return; }
    setLead((prev) => prev ? { ...prev, revenue, actual_costs } : prev);
    setSavingEcon(false);
    toast.success("Økonomi opdateret");
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

  const logCall = async () => {
    if (!id) return;
    const { data, error } = await supabase.from("communication_logs").insert({
      lead_id: id,
      type: "phone_call" as Enums<"comm_type">,
      direction: "outbound" as Enums<"comm_direction">,
      summary: "Udgående opkald",
      created_by: user?.id,
    }).select("id").single();

    if (error) { toast.error("Kunne ikke logge opkald"); return; }
    await supabase.from("leads").update({ last_contacted_at: new Date().toISOString() }).eq("id", id);
    setLead((prev) => prev ? { ...prev, last_contacted_at: new Date().toISOString() } : prev);
    setCallLogId(data.id);
    setCallNote("");
    setCallFollowup("");
    toast.success("Opkald logget");
    loadData();
  };

  const saveCallDetails = async () => {
    if (!callLogId) return;
    setSavingCallNote(true);
    if (callNote.trim()) {
      await supabase.from("communication_logs").update({ summary: `Udgående opkald: ${callNote.trim()}` }).eq("id", callLogId);
    }
    if (callFollowup && id) {
      const value = new Date(callFollowup).toISOString();
      await supabase.from("leads").update({ next_followup_at: value }).eq("id", id);
      setFollowupDate(callFollowup);
      setLead((prev) => prev ? { ...prev, next_followup_at: value } : prev);
    }
    setSavingCallNote(false);
    setCallLogId(null);
    toast.success("Detaljer gemt");
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
  const customerId = lead.customer_id as string | null;
  const profit = (lead.revenue ?? 0) - (lead.actual_costs ?? 0);

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

      {/* Customer link */}
      {customerId && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm">Tilknyttet kunde</span>
          <span className="text-xs text-muted-foreground ml-auto">ID: {customerId.slice(0, 8)}…</span>
        </div>
      )}

      {/* Quick contact + one-click call */}
      <div className="flex gap-2 flex-wrap">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:shadow-sm hover:border-secondary transition-all active:scale-95">
            <Phone className="h-4 w-4 text-primary" />
            {lead.phone}
          </a>
        )}
        {lead.phone && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="default" size="sm" className="gap-1.5" onClick={logCall}>
                <PhoneCall className="h-4 w-4" />
                Log opkald
              </Button>
            </PopoverTrigger>
            {callLogId && (
              <PopoverContent className="w-72 space-y-3" align="start">
                <p className="text-xs font-medium text-muted-foreground">Opkald logget ✓</p>
                <div>
                  <Label className="text-xs">Note (valgfri)</Label>
                  <Textarea value={callNote} onChange={(e) => setCallNote(e.target.value)} placeholder="Kort resumé..." rows={2} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Næste opfølgning</Label>
                  <Input type="date" value={callFollowup} onChange={(e) => setCallFollowup(e.target.value)} className="mt-1" />
                </div>
                <Button size="sm" className="w-full" onClick={saveCallDetails} disabled={savingCallNote}>
                  {savingCallNote ? "Gemmer..." : "Gem"}
                </Button>
              </PopoverContent>
            )}
          </Popover>
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

      {/* Economic Overview — Admin only */}
      {isAdmin && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Økonomi
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Omsætning (DKK)</Label>
              <Input
                type="number"
                value={editRevenue}
                onChange={(e) => setEditRevenue(e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Omkostninger (DKK)</Label>
              <Input
                type="number"
                value={editCosts}
                onChange={(e) => setEditCosts(e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Profit (DKK)</Label>
              <div className={cn(
                "mt-1 flex items-center h-10 rounded-md border bg-muted px-3 text-sm font-semibold tabular-nums",
                profit > 0 ? "text-status-success" : profit < 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                {((Number(editRevenue) || 0) - (Number(editCosts) || 0)).toLocaleString("da-DK")} kr.
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={saveEconomics} disabled={savingEcon}>
              {savingEcon ? "Gemmer..." : "Gem økonomi"}
            </Button>
          </div>
        </div>
      )}

      {/* Follow-up & Calendar section */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Opfølgning & Kalender
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label className="text-xs">Næste opfølgning</Label>
            <Input type="date" value={followupDate} onChange={(e) => updateFollowup(e.target.value)} className="mt-1" />
          </div>
          <div className="flex items-end gap-2">
            {hasCalendarSync && lead.google_calendar_link ? (
              <a
                href={lead.google_calendar_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-secondary bg-accent/50 px-3 py-2 text-xs font-medium text-primary hover:bg-secondary transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Åbn i kalender
              </a>
            ) : (
              <span className="text-xs text-muted-foreground py-2">
                Google Kalender — ikke tilsluttet
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

      {/* Missing Info Checklist */}
      <MissingInfoChecklist lead={lead} />

      {/* PDF Quote Placeholder */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" className="w-full gap-2" disabled>
            <FileText className="h-4 w-4" />
            PDF Tilbud
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Kommer snart — Google Slides integration</p>
        </TooltipContent>
      </Tooltip>
      {/* AI Insights Panel */}
      <LeadAiPanel
        leadId={lead.id}
        category={(lead as any).category}
        urgencyFlag={lead.urgency_flag ?? false}
        complexityFlag={lead.complexity_flag ?? false}
        suggestedQuestions={lead.suggested_questions}
        aiAnalysisFlags={(lead as any).ai_analysis_flags}
        suggestedPrice={(lead as any).suggested_price}
        quoteContent={(lead as any).quote_content}
        onAnalyzed={loadData}
      />

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
      <div><Label className="text-xs">Etage</Label><Input type="number" value={(editData as any).floor_level ?? 0} onChange={(e) => setEditData({ ...editData, floor_level: Number(e.target.value) } as any)} /></div>
      <div>
        <Label className="text-xs">Etageadskillelse</Label>
        <Input value={(editData as any).floor_separation_type ?? ""} onChange={(e) => setEditData({ ...editData, floor_separation_type: e.target.value } as any)} placeholder="Beton, træ..." />
      </div>
      <div><Label className="text-xs">Parkering (note)</Label><Input value={editData.parking_info ?? ""} onChange={(e) => setEditData({ ...editData, parking_info: e.target.value })} /></div>
      <div>
        <Label className="text-xs">Parkeringsstatus</Label>
        <Select value={(editData as any).parking_status ?? "unknown"} onValueChange={(v) => setEditData({ ...editData, parking_status: v } as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PARKING_STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div><Label className="text-xs">Elevator (note)</Label><Input value={editData.elevator_info ?? ""} onChange={(e) => setEditData({ ...editData, elevator_info: e.target.value })} /></div>
      <div><Label className="text-xs">Gulvhistorik</Label><Input value={(editData as any).floor_history ?? ""} onChange={(e) => setEditData({ ...editData, floor_history: e.target.value } as any)} placeholder="Tidligere behandlinger..." /></div>
      <div><Label className="text-xs">Ønsket udseende</Label><Input value={(editData as any).desired_look ?? ""} onChange={(e) => setEditData({ ...editData, desired_look: e.target.value } as any)} placeholder="Kundens ønskede resultat..." /></div>
      <div><Label className="text-xs">Kvalitetsforventning</Label><Input value={(editData as any).quality_expectation ?? ""} onChange={(e) => setEditData({ ...editData, quality_expectation: e.target.value } as any)} /></div>
      <div><Label className="text-xs">Tidsramme</Label><Input value={(editData as any).time_requirement ?? ""} onChange={(e) => setEditData({ ...editData, time_requirement: e.target.value } as any)} placeholder="Hvornår skal det laves?" /></div>
      <div><Label className="text-xs">Hastegrad (beskrivelse)</Label><Input value={(editData as any).urgency_status ?? ""} onChange={(e) => setEditData({ ...editData, urgency_status: e.target.value } as any)} /></div>
      <div className="sm:col-span-2 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editData.urgency_flag ?? false} onChange={(e) => setEditData({ ...editData, urgency_flag: e.target.checked })} className="rounded" />
          Haster
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editData.complexity_flag ?? false} onChange={(e) => setEditData({ ...editData, complexity_flag: e.target.checked })} className="rounded" />
          Kompleks
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={(editData as any).has_elevator ?? false} onChange={(e) => setEditData({ ...editData, has_elevator: e.target.checked } as any)} className="rounded" />
          Elevator
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={(editData as any).power_13a_available ?? false} onChange={(e) => setEditData({ ...editData, power_13a_available: e.target.checked } as any)} className="rounded" />
          13A strøm
        </label>
        </label>
      </div>
      <div className="sm:col-span-2">
        <Label className="text-xs">Interne noter</Label>
        <Textarea value={editData.internal_notes ?? ""} onChange={(e) => setEditData({ ...editData, internal_notes: e.target.value })} rows={4} className="min-h-[100px]" />
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
      {((lead as any).floor_level ?? 0) > 0 && <InfoRow label="Etage" value={String((lead as any).floor_level)} />}
      {(lead as any).floor_separation_type && <InfoRow label="Etageadskillelse" value={(lead as any).floor_separation_type} />}
      {lead.parking_info && <InfoRow label="Parkering" value={lead.parking_info} />}
      {(lead as any).parking_status && (lead as any).parking_status !== "unknown" && (
        <InfoRow label="Parkeringsstatus" value={PARKING_STATUS_LABELS[(lead as any).parking_status] ?? (lead as any).parking_status} />
      )}
      {lead.elevator_info && <InfoRow label="Elevator" value={lead.elevator_info} />}
      {(lead as any).has_elevator && <InfoRow label="Elevator tilgængelig" value="Ja" />}
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
