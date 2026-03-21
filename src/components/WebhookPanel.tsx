import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, Webhook, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";

interface WebhookSetting {
  id: string;
  event_type: string;
  webhook_url: string;
  is_active: boolean;
  created_at: string;
}

interface WebhookLog {
  id: string;
  event_type: string;
  status_code: number | null;
  created_at: string;
}

const EVENT_TYPES: Record<string, string> = {
  lead_created: "Lead oprettet",
  lead_won: "Lead vundet",
  status_changed: "Status ændret",
  supplier_availability_request: "Leverandør tilgængelighed",
};

const FIELD_MAPPING = [
  { elementor: "name", lead: "name", description: "Kundens fulde navn" },
  { elementor: "phone", lead: "phone", description: "Telefonnummer" },
  { elementor: "email", lead: "email", description: "Email-adresse" },
  { elementor: "address", lead: "address", description: "Gadeadresse" },
  { elementor: "city", lead: "city", description: "By" },
  { elementor: "postal_code", lead: "postal_code", description: "Postnummer" },
  { elementor: "job_type", lead: "job_type", description: "Type opgave (slibning, lakering, etc.)" },
  { elementor: "floor_type", lead: "floor_type", description: "Gulvtype (eg, fyr, etc.)" },
  { elementor: "square_meters", lead: "square_meters", description: "Antal kvadratmeter (tal)" },
  { elementor: "message / lead_message", lead: "lead_message", description: "Kundens besked" },
];

export default function WebhookPanel() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<WebhookSetting[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [showIncoming, setShowIncoming] = useState(false);
  const [showMapping, setShowMapping] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newEventType, setNewEventType] = useState("lead_created");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const restUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/leads`;

  const load = async () => {
    const [settingsRes, logsRes] = await Promise.all([
      supabase.from("webhook_settings").select("*").order("created_at", { ascending: false }),
      supabase.from("webhook_logs").select("id, event_type, status_code, created_at").order("created_at", { ascending: false }).limit(20),
    ]);
    setSettings((settingsRes.data as WebhookSetting[]) ?? []);
    setLogs((logsRes.data as WebhookLog[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const addWebhook = async () => {
    if (!newUrl.trim()) { toast.error("URL er påkrævet"); return; }
    setSaving(true);
    const { error } = await supabase.from("webhook_settings").insert({
      event_type: newEventType,
      webhook_url: newUrl.trim(),
      created_by: user?.id,
    } as any);
    setSaving(false);
    if (error) { toast.error("Kunne ikke gemme webhook"); return; }
    toast.success("Webhook tilføjet");
    setNewUrl("");
    setShowForm(false);
    load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("webhook_settings").update({ is_active: !current } as any).eq("id", id);
    load();
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm("Slet denne webhook?")) return;
    await supabase.from("webhook_settings").delete().eq("id", id);
    toast.success("Webhook slettet");
    load();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopieret");
  };

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Webhook className="h-4 w-4" />
        Webhooks
      </h2>

      {/* Incoming webhooks */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <button
          onClick={() => setShowIncoming(!showIncoming)}
          className="flex items-center justify-between w-full p-4 text-left hover:bg-accent/30 transition-colors"
        >
          <span className="text-sm font-medium flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4 text-primary" />
            Indgående (Make.com → CRM)
          </span>
          {showIncoming ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showIncoming && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Brug denne URL i Make.com's HTTP-modul til at oprette leads automatisk via POST.
            </p>
            <div>
              <Label className="text-xs">REST URL</Label>
              <div className="flex gap-2 mt-1">
                <Input value={restUrl} readOnly className="text-xs font-mono" />
                <Button variant="outline" size="icon" className="shrink-0" onClick={() => copyToClipboard(restUrl)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">API Key (Header: apikey)</Label>
              <div className="flex gap-2 mt-1">
                <Input value={anonKey} readOnly className="text-xs font-mono" />
                <Button variant="outline" size="icon" className="shrink-0" onClick={() => copyToClipboard(anonKey)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs font-medium mb-1">Eksempel (curl):</p>
              <pre className="text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST '${restUrl}' \\
  -H 'apikey: ${anonKey?.slice(0, 20)}...' \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"Ny Kunde","phone":"12345678","source":"website_form"}'`}
              </pre>
            </div>

            {/* Field mapping table */}
            <div>
              <button
                onClick={() => setShowMapping(!showMapping)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                {showMapping ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Feltmapping (Elementor → Lead)
              </button>
              {showMapping && (
                <div className="mt-2 rounded-md border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-2 font-medium text-muted-foreground">Formular-felt</th>
                        <th className="text-left p-2 font-medium text-muted-foreground">Lead-kolonne</th>
                        <th className="text-left p-2 font-medium text-muted-foreground hidden sm:table-cell">Beskrivelse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FIELD_MAPPING.map((f) => (
                        <tr key={f.lead} className="border-t">
                          <td className="p-2 font-mono text-[11px]">{f.elementor}</td>
                          <td className="p-2 font-mono text-[11px] text-primary">{f.lead}</td>
                          <td className="p-2 text-muted-foreground hidden sm:table-cell">{f.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[11px] text-muted-foreground p-2 bg-muted/30">
                    I Make.com: Sæt HTTP-modulet til at sende JSON med nøglerne i kolonnen "Lead-kolonne". Tilføj <code className="font-mono">source: "website_form"</code> for at markere kilden.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Outgoing webhooks */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <ArrowUpFromLine className="h-4 w-4 text-primary" />
            Udgående (CRM → Make.com)
          </span>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Tilføj
          </Button>
        </div>

        {showForm && (
          <div className="rounded-lg bg-accent/30 p-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Hændelse</Label>
                <Select value={newEventType} onValueChange={setNewEventType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_TYPES).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Webhook URL</Label>
                <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://hook.eu2.make.com/..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Annuller</Button>
              <Button size="sm" onClick={addWebhook} disabled={saving}>
                {saving ? "Gemmer..." : "Gem"}
              </Button>
            </div>
          </div>
        )}

        {settings.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Ingen udgående webhooks konfigureret.</p>
        ) : (
          <div className="space-y-2">
            {settings.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-md border p-2.5">
                <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s.id, s.is_active)} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{EVENT_TYPES[s.event_type] ?? s.event_type}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{s.webhook_url}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => deleteWebhook(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent logs */}
      {logs.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Seneste webhook-kald</p>
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-xs py-1">
                <span className="text-muted-foreground">{EVENT_TYPES[log.event_type] ?? log.event_type}</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-mono",
                    log.status_code && log.status_code >= 200 && log.status_code < 300
                      ? "text-green-600"
                      : "text-destructive"
                  )}>
                    {log.status_code ?? "—"}
                  </span>
                  <span className="text-muted-foreground/60">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: da })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
