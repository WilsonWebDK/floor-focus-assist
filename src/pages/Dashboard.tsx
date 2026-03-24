import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import DashboardWidget from "@/components/DashboardWidget";
import StatusBadge from "@/components/StatusBadge";
import PriorityFeed from "@/components/PriorityFeed";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Inbox, AlertTriangle, Clock, Bell, CheckCircle2, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";

type Lead = Tables<"leads">;
type Reminder = Tables<"reminders">;

export default function Dashboard() {
  const [newLeads, setNewLeads] = useState<Lead[]>([]);
  const [urgentLeads, setUrgentLeads] = useState<Lead[]>([]);
  const [followUpsToday, setFollowUpsToday] = useState<Lead[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = useIsAdmin();

  // Finance
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  useEffect(() => {
    async function load() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [newRes, urgentRes, followupRes, remindersRes] = await Promise.all([
        supabase
          .from("leads")
          .select("*")
          .eq("status", "new")
          .order("created_at", { ascending: false }),
        supabase
          .from("leads")
          .select("*")
          .eq("urgency_flag", true)
          .not("status", "in", '("won","lost")')
          .order("created_at", { ascending: false }),
        supabase
          .from("leads")
          .select("*")
          .gte("next_followup_at", today.toISOString())
          .lt("next_followup_at", tomorrow.toISOString()),
        supabase
          .from("reminders")
          .select("*")
          .eq("status", "pending")
          .order("due_at", { ascending: true })
          .limit(20),
      ]);

      setNewLeads(newRes.data ?? []);
      setUrgentLeads(urgentRes.data ?? []);
      setFollowUpsToday(followupRes.data ?? []);
      setReminders(remindersRes.data ?? []);

      // Finance: aggregate revenue/costs for won leads
      const { data: wonLeads } = await supabase
        .from("leads")
        .select("revenue, actual_costs")
        .eq("status", "won");

      if (wonLeads) {
        const rev = wonLeads.reduce((sum, l) => sum + (Number(l.revenue) || 0), 0);
        const costs = wonLeads.reduce((sum, l) => sum + (Number(l.actual_costs) || 0), 0);
        setTotalRevenue(rev);
        setTotalProfit(rev - costs);
      }

      setLoading(false);
    }
    load();
  }, []);

  const todayReminders = reminders.filter((r) => {
    const due = new Date(r.due_at);
    const now = new Date();
    return due.toDateString() === now.toDateString();
  });

  const allLeadsMap = new Map<string, Lead>();
  [...newLeads, ...urgentLeads, ...followUpsToday].forEach((l) => allLeadsMap.set(l.id, l));
  const allLeads = Array.from(allLeadsMap.values());

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
          </div>
        </div>
      )}

      {/* Widgets grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <DashboardWidget
          title="Nye leads"
          count={newLeads.length}
          icon={<Inbox className="h-4 w-4" />}
          accent={newLeads.length > 0 ? "warning" : "default"}
        >
          {newLeads.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {newLeads.slice(0, 3).map((lead) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="block text-sm text-foreground hover:text-primary transition-colors truncate"
                >
                  {lead.name} — {lead.city || "Ukendt by"}
                </Link>
              ))}
              {newLeads.length > 3 && (
                <Link to="/leads?status=new" className="text-xs text-primary font-medium">
                  +{newLeads.length - 3} mere
                </Link>
              )}
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget
          title="Haster"
          count={urgentLeads.length}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent={urgentLeads.length > 0 ? "urgent" : "default"}
        >
          {urgentLeads.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {urgentLeads.slice(0, 3).map((lead) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate text-foreground hover:text-primary transition-colors">
                    {lead.name}
                  </span>
                  <StatusBadge status={lead.status} />
                </Link>
              ))}
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget
          title="Opfølgning i dag"
          count={followUpsToday.length}
          icon={<Clock className="h-4 w-4" />}
          accent={followUpsToday.length > 0 ? "warning" : "default"}
        >
          {followUpsToday.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {followUpsToday.slice(0, 3).map((lead) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="block text-sm text-foreground hover:text-primary transition-colors truncate"
                >
                  {lead.name}
                </Link>
              ))}
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget
          title="Påmindelser i dag"
          count={todayReminders.length}
          icon={<Bell className="h-4 w-4" />}
          accent={todayReminders.length > 0 ? "warning" : "default"}
        >
          {todayReminders.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {todayReminders.slice(0, 3).map((r) => (
                <div key={r.id} className="text-sm text-foreground truncate">
                  {r.title}
                </div>
              ))}
            </div>
          )}
        </DashboardWidget>
      </div>

      {/* Priority Feed */}
      <PriorityFeed leads={allLeads} />

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
