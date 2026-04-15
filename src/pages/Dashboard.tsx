import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import DashboardWidget from "@/components/DashboardWidget";
import StatusBadge from "@/components/StatusBadge";
import LeadScoreBadge from "@/components/LeadScoreBadge";
import PriorityFeed from "@/components/PriorityFeed";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, AlertTriangle, Clock, Bell, CheckCircle2, TrendingUp, PhoneCall, CalendarCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";

type Lead = Tables<"leads">;
type Reminder = Tables<"reminders">;

const PIPELINE_TABS = [
  { value: "new", label: "Nye", statuses: ["new", "needs_qualification"] },
  { value: "contacted", label: "Kontaktet", statuses: ["contacted", "kontaktet_tlf", "kontaktet_mail", "kontaktet_sms", "opkald_mislykkedes"] },
  { value: "offer", label: "Tilbud sendt", statuses: ["offer_sent"] },
  { value: "waiting", label: "Venter", statuses: ["waiting_for_customer", "ready_for_pricing", "mangler_pris", "inspection_scheduled"] },
  { value: "won", label: "Vundet", statuses: ["won"] },
] as const;

export default function Dashboard() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = useIsAdmin();

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [dailyCallCount, setDailyCallCount] = useState(0);
  const [inspectionCount, setInspectionCount] = useState(0);
  const [unrealizedPotential, setUnrealizedPotential] = useState(0);

  useEffect(() => {
    async function load() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [leadsRes, remindersRes, callsRes, inspRes] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("reminders").select("*").eq("status", "pending").order("due_at", { ascending: true }).limit(20),
        supabase.from("communication_logs").select("id", { count: "exact", head: true }).eq("type", "phone_call").gte("created_at", today.toISOString()),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "inspection_scheduled" as any),
      ]);

      const leads = leadsRes.data ?? [];
      setAllLeads(leads);
      setReminders(remindersRes.data ?? []);
      setDailyCallCount(callsRes.count ?? 0);
      setInspectionCount(inspRes.count ?? 0);

      const wonLeads = leads.filter(l => l.status === "won");
      const rev = wonLeads.reduce((sum, l) => sum + (Number(l.revenue) || 0), 0);
      const costs = wonLeads.reduce((sum, l) => sum + (Number(l.actual_costs) || 0), 0);
      setTotalRevenue(rev);
      setTotalProfit(rev - costs);

      const activeLeads = leads.filter(l => l.status !== "won" && l.status !== "lost");
      setUnrealizedPotential(activeLeads.reduce((sum, l) => sum + (Number(l.revenue) || 0), 0));

      setLoading(false);
    }
    load();
  }, []);

  const newLeads = allLeads.filter(l => l.status === "new");
  const urgentLeads = allLeads.filter(l => l.urgency_flag && l.status !== "won" && l.status !== "lost");
  const todayReminders = reminders.filter((r) => new Date(r.due_at).toDateString() === new Date().toDateString());

  const feedLeads = new Map<string, Lead>();
  [...newLeads, ...urgentLeads].forEach((l) => feedLeads.set(l.id, l));

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-balance">Oversigt</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Finance summary — Admin only */}
      {isAdmin && (
        <div className="rounded-lg border-l-4 border-status-success/40 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            <h3 className="text-sm font-medium">Økonomi (vundne leads)</h3>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Omsætning</p>
              <p className="text-lg font-bold tabular-nums">{totalRevenue.toLocaleString("da-DK")} kr.</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className={`text-lg font-bold tabular-nums ${totalProfit >= 0 ? "text-status-success" : "text-destructive"}`}>
                {totalProfit.toLocaleString("da-DK")} kr.
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Urealiseret potentiale</p>
              <p className="text-lg font-bold tabular-nums text-status-warning">
                {unrealizedPotential.toLocaleString("da-DK")} kr.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick widgets */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardWidget title="Nye leads" count={newLeads.length} icon={<Inbox className="h-4 w-4" />} accent={newLeads.length > 0 ? "warning" : "default"} />
        <DashboardWidget title="Haster" count={urgentLeads.length} icon={<AlertTriangle className="h-4 w-4" />} accent={urgentLeads.length > 0 ? "urgent" : "default"} />
        <DashboardWidget title="Påmindelser i dag" count={todayReminders.length} icon={<Bell className="h-4 w-4" />} accent={todayReminders.length > 0 ? "warning" : "default"} />
        <DashboardWidget title="Opkald i dag" count={dailyCallCount} icon={<PhoneCall className="h-4 w-4" />} accent="default" />
        <DashboardWidget title="Inspektioner booket" count={inspectionCount} icon={<CalendarCheck className="h-4 w-4" />} accent={inspectionCount > 0 ? "warning" : "default"} />
      </div>

      {/* Pipeline Tabs */}
      <div className="rounded-lg border bg-card">
        <Tabs defaultValue="new">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent px-2 pt-2">
            {PIPELINE_TABS.map((tab) => {
              const count = allLeads.filter(l => (tab.statuses as readonly string[]).includes(l.status)).length;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  {tab.label} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>
          {PIPELINE_TABS.map((tab) => {
            const tabLeads = allLeads.filter(l => (tab.statuses as readonly string[]).includes(l.status));
            return (
              <TabsContent key={tab.value} value={tab.value} className="p-3 space-y-1.5">
                {tabLeads.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Ingen leads</p>
                ) : (
                  tabLeads.slice(0, 10).map((lead) => (
                    <Link
                      key={lead.id}
                      to={`/leads/${lead.id}`}
                      className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-accent/50 transition-colors text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <LeadScoreBadge
                          manualScore={(lead as any).manual_lead_score ?? null}
                          calculatedScore={(lead as any).calculated_lead_score ?? null}
                        />
                        <span className="truncate">{lead.name}</span>
                        {lead.city && <span className="text-xs text-muted-foreground hidden sm:inline">— {lead.city}</span>}
                      </div>
                      <StatusBadge status={lead.status} />
                    </Link>
                  ))
                )}
                {tabLeads.length > 10 && (
                  <Link to={`/leads?status=${tab.statuses[0]}`} className="block text-xs text-primary font-medium text-center pt-2">
                    +{tabLeads.length - 10} mere
                  </Link>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Priority Feed */}
      <PriorityFeed leads={Array.from(feedLeads.values())} />

      {/* Empty state */}
      {allLeads.length === 0 && (
        <div className="rounded-lg border bg-card p-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Ingen leads endnu. Opret din første lead for at komme i gang.
          </p>
        </div>
      )}
    </div>
  );
}
