import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardWidgetProps {
  title: string;
  count?: number;
  icon: ReactNode;
  accent?: "default" | "urgent" | "success" | "warning";
  children?: ReactNode;
  className?: string;
}

const accentMap = {
  default: "border-border",
  urgent: "border-status-urgent/40",
  success: "border-status-success/40",
  warning: "border-status-warning/40",
};

export default function DashboardWidget({
  title,
  count,
  icon,
  accent = "default",
  children,
  className,
}: DashboardWidgetProps) {
  return (
    <div
      className={cn(
        "rounded-lg border-l-4 bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        accentMap[accent],
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        {count !== undefined && (
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
