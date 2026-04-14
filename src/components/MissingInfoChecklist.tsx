import type { Tables } from "@/integrations/supabase/types";
import { Progress } from "@/components/ui/progress";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Lead = Tables<"leads">;

interface CheckItem {
  label: string;
  ok: boolean;
}

export default function MissingInfoChecklist({ lead }: { lead: Lead }) {
  const items: CheckItem[] = [
    { label: "Billeder", ok: !!((lead as any).image_urls?.length) },
    { label: "Kvadratmeter", ok: !!lead.square_meters },
    { label: "Opgavetype", ok: !!lead.job_type },
    { label: "Gulvtype", ok: !!lead.floor_type },
    { label: "Hastegrad", ok: !!lead.urgency_flag },
    { label: "Behandlingsønske", ok: !!lead.treatment_preference },
  ];

  const doneCount = items.filter((i) => i.ok).length;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h2 className="text-sm font-semibold">Informationsstatus</h2>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{doneCount} af {items.length} udfyldt</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>
      <div className="grid gap-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            {item.ok ? (
              <Check className="h-3.5 w-3.5 text-status-success shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-destructive shrink-0" />
            )}
            <span className={cn(item.ok ? "text-foreground" : "text-muted-foreground")}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
