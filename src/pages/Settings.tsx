import { Mail } from "lucide-react";
import KnowledgeBase from "@/components/KnowledgeBase";
import WebhookPanel from "@/components/WebhookPanel";
import SalesTemplates from "@/components/SalesTemplates";

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

      {/* Sales Templates */}
      <SalesTemplates />

      {/* Webhooks */}
      <WebhookPanel />
    </div>
  );
}
