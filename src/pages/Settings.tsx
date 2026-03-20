import { CalendarDays, Mail, ChevronRight, Brain } from "lucide-react";
import KnowledgeBase from "@/components/KnowledgeBase";

const INTEGRATIONS = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Synkroniser opfølgninger automatisk med din Google Kalender.",
    icon: CalendarDays,
    comingSoon: true,
  },
  {
    id: "google-mail",
    name: "Gmail",
    description: "Match e-mails automatisk til leads og vis kommunikationshistorik.",
    icon: Mail,
    comingSoon: true,
  },
];

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-balance">Indstillinger</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Administrer integrationer, vidensbase og kontoindstillinger.
        </p>
      </div>

      {/* Knowledge Base */}
      <KnowledgeBase />

      {/* Integrations */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Integrationer
        </h2>
        <div className="space-y-3">
          {INTEGRATIONS.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-shadow"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                <integration.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{integration.name}</p>
                  {integration.comingSoon && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Kommer snart
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {integration.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
