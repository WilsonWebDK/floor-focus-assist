import { useState } from "react";
import type { Tables } from "@/integrations/supabase/types";
import type { Enums } from "@/integrations/supabase/types";
import { COMM_TYPE_LABELS, COMM_DIRECTION_LABELS } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Phone, Mail, MessageSquare, Users, StickyNote, MoreHorizontal, Inbox } from "lucide-react";

type CommLog = Tables<"communication_logs">;

const COMM_ICONS: Record<string, typeof Phone> = {
  phone_call: Phone,
  email: Mail,
  sms: MessageSquare,
  meeting: Users,
  note: StickyNote,
  other: MoreHorizontal,
};

interface CommunicationTimelineProps {
  logs: CommLog[];
}

export default function CommunicationTimeline({ logs }: CommunicationTimelineProps) {
  const [activeTab, setActiveTab] = useState<"all" | "gmail">("all");

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg bg-muted">
        <button
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
            activeTab === "all"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Alle
        </button>
        <button
          onClick={() => setActiveTab("gmail")}
          className={cn(
            "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
            activeTab === "gmail"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Gmail
        </button>
      </div>

      {activeTab === "gmail" ? (
        <div className="rounded-lg border border-dashed border-secondary bg-accent/40 p-6 text-center">
          <Mail className="h-8 w-8 text-primary/40 mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">
            Gmail-integration kommer snart
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Se emailhistorik direkte i CRM
          </p>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-accent/30 p-6 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Ingen kommunikation logget endnu</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const Icon = COMM_ICONS[log.type] ?? MoreHorizontal;
            const isOutbound = log.direction === "outbound";
            const isInternal = log.direction === "internal";

            return (
              <div
                key={log.id}
                className={cn(
                  "flex gap-2",
                  isOutbound && "justify-end",
                  isInternal && "justify-center"
                )}
              >
                {!isOutbound && !isInternal && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                    isOutbound && "bg-primary text-primary-foreground rounded-br-sm",
                    !isOutbound && !isInternal && "bg-secondary/60 text-foreground rounded-bl-sm",
                    isInternal && "bg-muted text-muted-foreground italic text-center rounded-lg max-w-[90%]"
                  )}
                >
                  <p className="overflow-wrap-break-word">{log.summary}</p>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 mt-1 text-[10px]",
                      isOutbound ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
                    )}
                  >
                    <span>{COMM_TYPE_LABELS[log.type]}</span>
                    <span>·</span>
                    <span>
                      {formatDistanceToNow(new Date(log.created_at), {
                        addSuffix: true,
                        locale: da,
                      })}
                    </span>
                  </div>
                </div>
                {isOutbound && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
