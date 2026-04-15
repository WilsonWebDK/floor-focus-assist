import { cn } from "@/lib/utils";

interface LeadScoreBadgeProps {
  manualScore: number | null;
  calculatedScore: number | null;
  className?: string;
}

export default function LeadScoreBadge({ manualScore, calculatedScore, className }: LeadScoreBadgeProps) {
  const score = manualScore ?? calculatedScore;
  if (score == null) return null;

  const color =
    score <= 2 ? "bg-destructive/15 text-destructive" :
    score <= 5 ? "bg-yellow-500/15 text-yellow-600" :
    score <= 7 ? "bg-emerald-500/15 text-emerald-600" :
    "bg-status-success/15 text-status-success";

  return (
    <span className={cn(
      "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums min-w-[22px]",
      color,
      className
    )}>
      {score}
    </span>
  );
}
