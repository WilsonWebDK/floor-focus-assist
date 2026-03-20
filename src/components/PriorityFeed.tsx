import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import StatusBadge from "@/components/StatusBadge";
import { Flame, Puzzle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";

type Lead = Tables<"leads">;

interface PriorityLead extends Lead {
  priorityScore: number;
  recommendation: string;
}

function calculatePriority(lead: Lead): PriorityLead {
  let score = 0;
  const reasons: string[] = [];

  if (lead.urgency_flag) {
    score += 3;
    reasons.push("Markeret som hastende");
  }
  if (lead.complexity_flag) {
    score += 1;
    reasons.push("Kompleks opgave");
  }

  const ageMs = Date.now() - new Date(lead.created_at).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (lead.status === "new" && ageHours > 24) {
    score += 3;
    reasons.push("Ikke kontaktet i over 24 timer");
  } else if (lead.status === "new" && ageHours > 2) {
    score += 2;
    reasons.push("Ikke kontaktet i over 2 timer");
  }

  // Extract AI recommendation
  const flags = lead.ai_analysis_flags as any;
  let recommendation = reasons.join(" · ") || "Ingen prioritering";
  if (flags?.urgency_reason) recommendation = flags.urgency_reason;
  else if (flags?.complexity_reason) recommendation = flags.complexity_reason;

  return { ...lead, priorityScore: score, recommendation };
}

export default function PriorityFeed({ leads }: { leads: Lead[] }) {
  const closedStatuses = ["won", "lost"];
  const priorityLeads = leads
    .filter((l) => !closedStatuses.includes(l.status))
    .map(calculatePriority)
    .filter((l) => l.priorityScore > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 10);

  if (priorityLeads.length === 0) return null;

  const ageHours = (createdAt: string) => (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Prioritetsfeed
      </h2>
      <div className="space-y-2">
        {priorityLeads.map((lead) => {
          const isCritical = lead.status === "new" && ageHours(lead.created_at) > 24;
          const isHighPriority = lead.priorityScore >= 3;

          return (
            <Link
              key={lead.id}
              to={`/leads/${lead.id}`}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow active:scale-[0.99]"
            >
              {/* Priority indicator */}
              <div className="shrink-0">
                {isHighPriority ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                  </span>
                ) : (
                  <span className="inline-flex rounded-full h-3 w-3 bg-yellow-500" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{lead.name}</p>
                  {isCritical && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                      <AlertCircle className="h-2.5 w-2.5" />
                      Kritisk opfølgning
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {lead.recommendation} · {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: da })}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {lead.urgency_flag && <Flame className="h-3.5 w-3.5 text-destructive" />}
                {lead.complexity_flag && <Puzzle className="h-3.5 w-3.5 text-yellow-500" />}
                <StatusBadge status={lead.status} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
