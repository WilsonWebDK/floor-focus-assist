import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";
import { Check, Clock, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type Reminder = Tables<"reminders">;

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "completed">("pending");

  const load = async () => {
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .eq("status", filter)
      .order("due_at", { ascending: filter === "pending" });
    setReminders(data ?? []);
    setLoading(false);
  };

  useEffect(() => { setLoading(true); load(); }, [filter]);

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

  const isOverdue = (due: string) => new Date(due) < new Date();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Påmindelser</h1>

      <div className="flex gap-2">
        {(["pending", "completed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {s === "pending" ? "Aktive" : "Fuldførte"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : reminders.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === "pending" ? "Ingen aktive påmindelser" : "Ingen fuldførte påmindelser"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                {r.description && <p className="text-xs text-muted-foreground truncate">{r.description}</p>}
                <p className={cn("text-xs mt-0.5", isOverdue(r.due_at) && filter === "pending" ? "text-status-urgent font-medium" : "text-muted-foreground")}>
                  <Clock className="inline h-3 w-3 mr-1" />
                  {formatDistanceToNow(new Date(r.due_at), { addSuffix: true, locale: da })}
                </p>
              </div>
              {filter === "pending" ? (
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
