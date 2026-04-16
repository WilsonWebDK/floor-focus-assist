import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, isToday, isBefore, startOfDay } from "date-fns";
import { da } from "date-fns/locale";
import { Check, Clock, RotateCcw, ExternalLink, Bot, User } from "lucide-react";
import { toast } from "sonner";

type Reminder = Tables<"reminders">;

type FilterTab = "active" | "overdue" | "today" | "upcoming" | "completed";

const TAB_LABELS: Record<FilterTab, string> = {
  active: "Aktive",
  overdue: "Forfaldne",
  today: "I dag",
  upcoming: "Kommende",
  completed: "Fuldførte",
};

export default function Reminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("active");
  const [sourceFilter, setSourceFilter] = useState<"all" | "auto" | "manual">("all");

  const load = async () => {
    setLoading(true);
    if (filter === "completed") {
      const { data } = await supabase
        .from("reminders")
        .select("*")
        .eq("status", "completed")
        .order("due_at", { ascending: false })
        .limit(50);
      setReminders(data ?? []);
    } else {
      const { data } = await supabase
        .from("reminders")
        .select("*")
        .in("status", ["pending", "snoozed"])
        .order("due_at", { ascending: true });
      
      const now = new Date();
      const todayStart = startOfDay(now);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      const filtered = (data ?? []).filter((r) => {
        const due = new Date(r.due_at);
        if (filter === "active") return true;
        if (filter === "overdue") return isBefore(due, todayStart);
        if (filter === "today") return isToday(due);
        return due >= tomorrowStart;
      });
      setReminders(filtered);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const complete = async (id: string) => {
    await supabase.from("reminders").update({ status: "completed" }).eq("id", id);
    toast.success("Påmindelse fuldført");
    load();
  };

  const reopen = async (id: string) => {
    await supabase.from("reminders").update({ status: "pending" }).eq("id", id);
    toast.success("Påmindelse genåbnet");
    load();
  };

  const isOverdue = (due: string) => isBefore(new Date(due), startOfDay(new Date()));

  // Split by source
  const filteredBySource = reminders.filter((r) => {
    if (sourceFilter === "all") return true;
    if (sourceFilter === "auto") return !r.created_by;
    return r.created_by === user?.id;
  });

  const autoCount = reminders.filter(r => !r.created_by).length;
  const manualCount = reminders.filter(r => r.created_by === user?.id).length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Påmindelser</h1>

      <div className="flex gap-1.5 overflow-x-auto">
        {(Object.entries(TAB_LABELS) as [FilterTab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
              filter === key
                ? key === "overdue"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Source filter */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setSourceFilter("all")}
          className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", sourceFilter === "all" ? "bg-secondary text-secondary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground")}
        >
          Alle ({reminders.length})
        </button>
        <button
          onClick={() => setSourceFilter("auto")}
          className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1", sourceFilter === "auto" ? "bg-secondary text-secondary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground")}
        >
          <Bot className="h-3 w-3" /> Automatiske ({autoCount})
        </button>
        <button
          onClick={() => setSourceFilter("manual")}
          className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1", sourceFilter === "manual" ? "bg-secondary text-secondary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground")}
        >
          <User className="h-3 w-3" /> Mine ({manualCount})
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filteredBySource.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === "overdue" && "Ingen forfaldne påmindelser 🎉"}
            {filter === "active" && "Ingen aktive påmindelser"}
            {filter === "today" && "Ingen påmindelser i dag"}
            {filter === "upcoming" && "Ingen kommende påmindelser"}
            {filter === "completed" && "Ingen fuldførte påmindelser"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBySource.map((r) => (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-card p-3",
                filter === "overdue" && "border-destructive/30"
              )}
            >
              {filter === "overdue" && (
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0" />
              )}
              {filter === "today" && (
                <span className="h-2 w-2 rounded-full bg-yellow-500 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {!r.created_by ? <Bot className="h-3 w-3 text-muted-foreground shrink-0" /> : <User className="h-3 w-3 text-muted-foreground shrink-0" />}
                  <p className="text-sm font-medium truncate">{r.title}</p>
                </div>
                {r.description && <p className="text-xs text-muted-foreground truncate">{r.description}</p>}
                <div className="flex items-center gap-2 mt-0.5">
                  <p className={cn(
                    "text-xs",
                    isOverdue(r.due_at) && filter !== "completed" ? "text-destructive font-medium" : "text-muted-foreground"
                  )}>
                    <Clock className="inline h-3 w-3 mr-1" />
                    {formatDistanceToNow(new Date(r.due_at), { addSuffix: true, locale: da })}
                  </p>
                  {r.related_type === "lead" && (
                    <Link
                      to={`/leads/${r.related_id}`}
                      className="text-xs text-primary hover:underline flex items-center gap-0.5"
                    >
                      <ExternalLink className="h-3 w-3" /> Åbn lead
                    </Link>
                  )}
                </div>
              </div>
              {filter !== "completed" ? (
                <Button variant="ghost" size="icon" onClick={() => complete(r.id)} className="shrink-0 h-8 w-8">
                  <Check className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => reopen(r.id)} className="shrink-0 h-8 w-8">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
