import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import StatusBadge from "@/components/StatusBadge";
import LeadScoreBadge from "@/components/LeadScoreBadge";
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS, LABEL_COLORS } from "@/lib/constants";
import { AlertTriangle, Search, Filter, Plus, ImageOff, Ruler, Wrench, Clock, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type Lead = Tables<"leads">;

const STATUS_OPTIONS = Object.entries(LEAD_STATUS_LABELS);

function MissingInfoBadges({ lead }: { lead: Lead }) {
  const badges: { label: string; icon: React.ReactNode }[] = [];

  if (!(lead as any).image_urls?.length) {
    badges.push({ label: "Billede", icon: <ImageOff className="h-2.5 w-2.5" /> });
  }
  if (!lead.square_meters) {
    badges.push({ label: "m²", icon: <Ruler className="h-2.5 w-2.5" /> });
  }
  if (!lead.job_type) {
    badges.push({ label: "Opgave", icon: <Wrench className="h-2.5 w-2.5" /> });
  }
  if (!lead.urgency_flag) {
    badges.push({ label: "Hast", icon: <Clock className="h-2.5 w-2.5" /> });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex gap-1 mt-0.5 flex-wrap">
      {badges.map((b) => (
        <span
          key={b.label}
          className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 text-destructive px-1.5 py-0.5 text-[10px] font-medium"
        >
          {b.icon}
          {b.label}
        </span>
      ))}
    </div>
  );
}

/** Check if a lead in 'new' status has been waiting >12h without contact */
function isUrgentNewLead(lead: Lead): boolean {
  if (lead.status !== "new") return false;
  if (lead.last_contacted_at) return false;
  const ageHours = differenceInHours(new Date(), new Date(lead.created_at));
  return ageHours >= 12;
}

/** Calculate priority score for a lead */
function calcPriorityScore(lead: Lead): number {
  const now = new Date();
  const hoursSinceCreated = differenceInHours(now, new Date(lead.created_at));

  // Data completeness: count of filled critical fields out of 4
  let completeness = 0;
  if ((lead as any).image_urls?.length) completeness++;
  if (lead.square_meters) completeness++;
  if (lead.job_type) completeness++;
  if (lead.urgency_flag) completeness++;

  return (lead.urgency_flag ? 100 : 0) + (hoursSinceCreated * -0.5) + (completeness * 10);
}

/** Sort leads by priority score descending */
function sortLeadsByPriority(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => calcPriorityScore(b) - calcPriorityScore(a));
}

export default function LeadList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "all";
  const [showFilters, setShowFilters] = useState(false);

  // Quick-Lead dialog
  const [showQuickLead, setShowQuickLead] = useState(false);
  const [qlName, setQlName] = useState("");
  const [qlPhone, setQlPhone] = useState("");
  const [qlAddress, setQlAddress] = useState("");
  const [qlSaving, setQlSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }
      const { data } = await query;
      setLeads(data ?? []);
      setLoading(false);
    }
    load();
  }, [statusFilter]);

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.phone?.includes(q) ||
      l.city?.toLowerCase().includes(q)
    );
  });

  const sorted = sortLeadsByPriority(filtered);

  const submitQuickLead = async () => {
    if (!qlName.trim()) { toast.error("Navn er påkrævet"); return; }
    setQlSaving(true);
    const { data, error } = await supabase.from("leads").insert({
      name: qlName.trim(),
      phone: qlPhone || null,
      address: qlAddress || null,
      source: "phone" as any,
      created_by: user?.id,
    } as any).select("id").single();

    if (error) { toast.error("Kunne ikke oprette lead"); setQlSaving(false); return; }
    toast.success("Lead oprettet");
    setShowQuickLead(false);
    setQlName(""); setQlPhone(""); setQlAddress("");
    setQlSaving(false);
    if (data?.id) navigate(`/leads/${data.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Leads</h1>
        <span className="text-sm text-muted-foreground tabular-nums">
          {sorted.length} {sorted.length === 1 ? "lead" : "leads"}
        </span>
      </div>

      {/* Search & filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg navn, email, telefon, by..."
              className="pl-9"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 px-3 rounded-md border text-sm font-medium transition-colors",
              showFilters || statusFilter !== "all"
                ? "bg-primary/10 border-primary/20 text-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-1.5 animate-fade-in">
            <button
              onClick={() => setSearchParams({})}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Alle
            </button>
            {STATUS_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setSearchParams({ status: value })}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  statusFilter === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {search ? "Ingen leads matcher din søgning" : "Ingen leads fundet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((lead) => {
            const urgentNew = isUrgentNewLead(lead);
            return (
              <Link
                key={lead.id}
                to={`/leads/${lead.id}`}
                className={cn(
                  "flex items-center justify-between rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow active:scale-[0.99]",
                  urgentNew && "border-l-4 border-l-destructive animate-pulse-subtle"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <LeadScoreBadge
                      manualScore={(lead as any).manual_lead_score ?? null}
                      calculatedScore={(lead as any).calculated_lead_score ?? null}
                    />
                    <p className="text-sm font-medium truncate">{lead.name}</p>
                    {lead.urgency_flag && (
                      <AlertTriangle className="h-3.5 w-3.5 text-status-urgent shrink-0" />
                    )}
                    {urgentNew && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/15 text-destructive px-1.5 py-0.5 text-[10px] font-semibold">
                        <Flame className="h-2.5 w-2.5" />
                        Ikke kontaktet
                      </span>
                    )}
                    {lead.revenue != null && Number(lead.revenue) > 0 && (
                      <span className="inline-flex items-center rounded-full bg-status-success/10 text-status-success px-1.5 py-0.5 text-[10px] font-semibold tabular-nums shrink-0">
                        {Number(lead.revenue).toLocaleString("da-DK")} kr.
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lead.city && `${lead.city} · `}
                    {lead.square_meters && `${lead.square_meters} m² · `}
                    {LEAD_SOURCE_LABELS[lead.source] ?? lead.source} ·{" "}
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: da })}
                  </p>
                  {/* Labels */}
                  {(lead as any).labels?.length > 0 && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {((lead as any).labels as string[]).map((label) => (
                        <span
                          key={label}
                          className={cn(
                            "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            LABEL_COLORS[label] ?? "bg-muted text-muted-foreground"
                          )}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  <MissingInfoBadges lead={lead} />
                </div>
                <StatusBadge status={lead.status} className="ml-2 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
}
