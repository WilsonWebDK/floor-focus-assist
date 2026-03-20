import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import DashboardWidget from "@/components/DashboardWidget";
import StatusBadge from "@/components/StatusBadge";
import PriorityFeed from "@/components/PriorityFeed";
import { Inbox, AlertTriangle, Clock, Bell, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";

type Lead = Tables<"leads">;
type Reminder = Tables<"reminders">;

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [leadsRes, remindersRes] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("reminders").select("*").eq("status", "pending").order("due_at", { ascending: true }).limit(20),
      ]);
      setLeads(leadsRes.data ?? []);
      setReminders(remindersRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const newLeads = leads
    .filter((l) => l.status === "new")
    .sort((a, b) => {
      const aIsWebhook = a.source !== "manual" ? 0 : 1;
      const bIsWebhook = b.source !== "manual" ? 0 : 1;
      if (aIsWebhook !== bIsWebhook) return aIsWebhook - bIsWebhook;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  const urgentLeads = leads.filter((l) => l.urgency_flag);
  const todayReminders = reminders.filter((r) => {
    const due = new Date(r.due_at);
    const now = new Date();
    return due.toDateString() === now.toDateString();
  });
  const followUpsToday = leads.filter((l) => {
    if (!l.next_followup_at) return false;
    const followup = new Date(l.next_followup_at);
    const now = new Date();
    return followup.toDateString() === now.toDateString();
  });

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
      <PriorityFeed leads={leads} />

      {/* Empty state */}
      {leads.length === 0 && (
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
