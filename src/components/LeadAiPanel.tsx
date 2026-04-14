import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Flame, Puzzle, Copy, Calculator, Loader2, Sparkles, ChevronDown, ChevronUp, Users, Star, FileText, Bell, ShieldAlert, Lightbulb, Route, BookOpen, Mail, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AiAnalysisFlags {
  urgency_reason?: string;
  complexity_reason?: string;
  category?: string;
  complexity_analysis?: string;
  potential_challenges?: string;
  recommended_approach?: string;
  suggested_draft?: string;
  analyzed_at?: string;
}

interface SuggestedPrice {
  price_min?: number;
  price_max?: number;
  confidence?: string;
  explanation?: string;
  missing_for_accuracy?: string;
  applied_rules?: string[];
  estimated_at?: string;
}

interface SupplierMatch {
  supplier_id: string;
  name: string;
  score: number;
  reason: string;
}

interface LeadAiPanelProps {
  leadId: string;
  category: string | null;
  urgencyFlag: boolean;
  complexityFlag: boolean;
  suggestedQuestions: string[] | null;
  aiAnalysisFlags: AiAnalysisFlags | null;
  suggestedPrice: SuggestedPrice | null;
  quoteContent: string | null;
  onAnalyzed: () => void;
}

export default function LeadAiPanel({
  leadId,
  category,
  urgencyFlag,
  complexityFlag,
  suggestedQuestions,
  aiAnalysisFlags,
  suggestedPrice,
  quoteContent,
  onAnalyzed,
}: LeadAiPanelProps) {
  const { user } = useAuth();
  const [analyzing, setAnalyzing] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [matching, setMatching] = useState(false);
  const [generatingQuote, setGeneratingQuote] = useState(false);
  const [supplierMatches, setSupplierMatches] = useState<SupplierMatch[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [localQuote, setLocalQuote] = useState(quoteContent || "");

  useEffect(() => {
    if (supplierMatches.length === 0) {
      runSupplierMatch(true);
    }
  }, [leadId]);

  useEffect(() => {
    setLocalQuote(quoteContent || "");
  }, [quoteContent]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    const { error } = await supabase.functions.invoke("analyze-lead", {
      body: { lead_id: leadId },
    });
    setAnalyzing(false);
    if (error) {
      toast.error("AI-analyse fejlede: " + error.message);
      return;
    }
    toast.success("AI-analyse fuldført");
    onAnalyzed();
  };

  const runPriceEstimate = async () => {
    setEstimating(true);
    const { error } = await supabase.functions.invoke("estimate-price", {
      body: { lead_id: leadId },
    });
    setEstimating(false);
    if (error) {
      toast.error("Prisberegning fejlede: " + error.message);
      return;
    }
    toast.success("Prisoverslag beregnet");
    onAnalyzed();
  };

  const runSupplierMatch = async (silent = false) => {
    setMatching(true);
    const { data, error } = await supabase.functions.invoke("match-supplier", {
      body: { lead_id: leadId },
    });
    setMatching(false);
    if (error) {
      if (!silent) toast.error("Leverandørmatch fejlede: " + error.message);
      return;
    }
    setSupplierMatches(data?.matches ?? []);
    if (!silent) {
      if ((data?.matches ?? []).length === 0) {
        toast.info(data?.message || "Ingen matches fundet");
      } else {
        toast.success("Leverandørmatch fundet");
      }
    }
  };

  const generateQuote = async () => {
    setGeneratingQuote(true);
    const { data, error } = await supabase.functions.invoke("generate-quote", {
      body: { lead_id: leadId },
    });
    setGeneratingQuote(false);
    if (error) {
      toast.error("Tilbudsgenerering fejlede: " + error.message);
      return;
    }
    if (data?.error) {
      toast.error(data.error);
      return;
    }
    setLocalQuote(data?.quote_text || "");
    toast.success("Tilbud genereret");
    onAnalyzed();
  };

  const requestAvailability = async (match: SupplierMatch) => {
    const { error } = await supabase.functions.invoke("fire-webhook", {
      body: {
        event_type: "supplier_availability_request",
        payload: {
          supplier_name: match.name,
          supplier_id: match.supplier_id,
          lead_id: leadId,
          lead_summary: `Lead: ${leadId}`,
        },
      },
    });
    if (error) {
      toast.error("Kunne ikke sende forespørgsel");
      return;
    }
    toast.success("Tilgængelighedsforespørgsel sendt via webhook");
  };

  const copyQuestion = (q: string) => {
    navigator.clipboard.writeText(q);
    toast.success("Kopieret til udklipsholder");
  };

  const copyQuote = () => {
    navigator.clipboard.writeText(localQuote);
    toast.success("Tilbud kopieret til udklipsholder");
  };

  const hasAnalysis = !!aiAnalysisFlags?.analyzed_at;
  const hasRundown = !!(aiAnalysisFlags?.complexity_analysis || aiAnalysisFlags?.potential_challenges || aiAnalysisFlags?.recommended_approach);
  const hasPrice = !!suggestedPrice?.price_min;

  const formatPrice = (n: number) =>
    n.toLocaleString("da-DK", { style: "decimal", maximumFractionDigits: 0 });

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full p-4 text-left hover:bg-accent/30 transition-colors"
      >
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          AI Indsigter
        </h2>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* 1. Analyze button */}
          <Button variant="outline" size="sm" onClick={runAnalysis} disabled={analyzing} className="w-full">
            {analyzing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            {analyzing ? "Analyserer lead og SOP'er..." : hasAnalysis ? "Kør analyse igen" : "Analysér med AI"}
          </Button>

          {/* 2. AI Analysis Rundown */}
          {hasRundown && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Salgsstrategi</p>
              
              {aiAnalysisFlags?.complexity_analysis && (
                <RundownCard
                  icon={<Puzzle className="h-3.5 w-3.5 text-yellow-600" />}
                  title="Kompleksitetsanalyse"
                  content={aiAnalysisFlags.complexity_analysis}
                />
              )}
              {aiAnalysisFlags?.potential_challenges && (
                <RundownCard
                  icon={<ShieldAlert className="h-3.5 w-3.5 text-destructive" />}
                  title="Potentielle udfordringer"
                  content={aiAnalysisFlags.potential_challenges}
                />
              )}
              {aiAnalysisFlags?.recommended_approach && (
                <RundownCard
                  icon={<Route className="h-3.5 w-3.5 text-primary" />}
                  title="Anbefalet tilgang"
                  content={aiAnalysisFlags.recommended_approach}
                />
              )}
            </div>
          )}

          {/* 3. Flags & Category */}
          {hasAnalysis && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {category && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                    {category}
                  </span>
                )}
                {urgencyFlag && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2.5 py-0.5 text-xs font-medium">
                    <Flame className="h-3 w-3" /> Haster
                  </span>
                )}
                {complexityFlag && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 text-yellow-600 px-2.5 py-0.5 text-xs font-medium">
                    <Puzzle className="h-3 w-3" /> Kompleks
                  </span>
                )}
              </div>

              {(aiAnalysisFlags?.urgency_reason || aiAnalysisFlags?.complexity_reason) && (
                <div className="text-xs text-muted-foreground space-y-1 pl-1">
                  {aiAnalysisFlags?.urgency_reason && (
                    <p><span className="font-medium">Haster:</span> {aiAnalysisFlags.urgency_reason}</p>
                  )}
                  {aiAnalysisFlags?.complexity_reason && (
                    <p><span className="font-medium">Kompleksitet:</span> {aiAnalysisFlags.complexity_reason}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. Suggested questions */}
          {suggestedQuestions && suggestedQuestions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Foreslåede spørgsmål</p>
              <div className="space-y-1.5">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => copyQuestion(q)}
                    className="flex items-start gap-2 w-full text-left text-sm rounded-md p-2 hover:bg-accent/50 transition-colors group"
                  >
                    <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                    <span className="flex-1">{q}</span>
                    <Copy className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4.5. Suggested email draft */}
          {aiAnalysisFlags?.suggested_draft && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Udkast til svar
                </p>
                <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground border-dashed flex items-center gap-1">
                  <Info className="h-2.5 w-2.5" />
                  Gmail afventer — kopiér manuelt
                </Badge>
              </div>
              <div className="rounded-lg bg-accent/30 p-3 space-y-2">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{aiAnalysisFlags.suggested_draft}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(aiAnalysisFlags.suggested_draft!);
                    toast.success("Email-udkast kopieret til udklipsholder");
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Kopiér til udklipsholder
                </Button>
              </div>
            </div>
          )}

          {/* 5. Price estimation */}
          <div className="border-t pt-4">
            <Button variant="outline" size="sm" onClick={runPriceEstimate} disabled={estimating} className="w-full">
              {estimating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5 mr-1.5" />}
              {hasPrice ? "Beregn pris igen" : "Beregn tilbudspris"}
            </Button>

            {hasPrice && suggestedPrice && (
              <div className="mt-3 rounded-lg bg-accent/30 p-3 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Prisoverslag</span>
                  <span className={cn(
                    "text-[10px] font-semibold uppercase rounded-full px-2 py-0.5",
                    suggestedPrice.confidence === "høj" ? "bg-green-500/10 text-green-600" :
                    suggestedPrice.confidence === "middel" ? "bg-yellow-500/10 text-yellow-600" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {suggestedPrice.confidence} sikkerhed
                  </span>
                </div>
                <p className="text-lg font-bold tabular-nums">
                  {formatPrice(suggestedPrice.price_min!)} – {formatPrice(suggestedPrice.price_max!)} kr.
                </p>
                {suggestedPrice.explanation && (
                  <p className="text-xs text-muted-foreground">{suggestedPrice.explanation}</p>
                )}
                {suggestedPrice.missing_for_accuracy && (
                  <p className="text-xs text-yellow-600">
                    Mangler: {suggestedPrice.missing_for_accuracy}
                  </p>
                )}
                {suggestedPrice.applied_rules && suggestedPrice.applied_rules.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Anvendte SOP'er</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestedPrice.applied_rules.map((rule, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
                          <BookOpen className="h-2.5 w-2.5" />
                          {rule}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. Quote generation with Coming Soon badge */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={generateQuote} disabled={generatingQuote} className="flex-1">
                {generatingQuote ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-1.5" />}
                {localQuote ? "Generér tilbud igen" : "Generér tilbud"}
              </Button>
              <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground border-dashed">
                Slides — Kommer snart
              </Badge>
            </div>

            {localQuote && (
              <div className="rounded-lg bg-accent/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Tilbudstekst</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={copyQuote}>
                    <Copy className="h-3 w-3 mr-1" /> Kopiér
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{localQuote}</p>
              </div>
            )}
          </div>

          {/* 7. Supplier matching with Coming Soon badge */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={() => runSupplierMatch(false)} disabled={matching} className="flex-1">
                {matching ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Users className="h-3.5 w-3.5 mr-1.5" />}
                Find bedste leverandør
              </Button>
              <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground border-dashed">
                Kommer snart
              </Badge>
            </div>

            {supplierMatches.length > 0 && (
              <div className="space-y-2">
                {supplierMatches.map((m, i) => (
                  <div key={m.supplier_id} className={cn(
                    "rounded-lg p-3 space-y-1",
                    i === 0 ? "bg-primary/5 border border-primary/20" : "bg-accent/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        {i === 0 && <Star className="h-3.5 w-3.5 text-primary fill-primary" />}
                        {m.name}
                      </span>
                      <span className="text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">
                        {m.score}/10
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.reason}</p>
                    {i === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1.5 h-7 text-xs"
                        onClick={() => requestAvailability(m)}
                      >
                        <Bell className="h-3 w-3 mr-1" />
                        Anmod om tilgængelighed
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RundownCard({ icon, title, content }: { icon: React.ReactNode; title: string; content: string }) {
  return (
    <div className="rounded-lg bg-accent/30 p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{content}</p>
    </div>
  );
}
