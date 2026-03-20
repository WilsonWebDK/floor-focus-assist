import { cn } from "@/lib/utils";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        LEAD_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {LEAD_STATUS_LABELS[status] ?? status}
    </span>
  );
}
