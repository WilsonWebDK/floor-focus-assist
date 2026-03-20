import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Brain, Flame, Puzzle, Copy, Calculator, Loader2, Sparkles, ChevronDown, ChevronUp, Users, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AiAnalysisFlags {
  urgency_reason?: string;
  complexity_reason?: string;
  category?: string;
  analyzed_at?: string;
}

interface SuggestedPrice {
  price_min?: number;
  price_max?: number;
  confidence?: string;
  explanation?: string;
  missing_for_accuracy?: string;
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
  onAnalyzed,
}: LeadAiPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [matching, setMatching] = useState(false);
  const [supplierMatches, setSupplierMatches] = useState<SupplierMatch[]>([]);
  const [expanded, setExpanded] = useState(true);

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

  const runSupplierMatch = async () => {
    setMatching(true);
    const { data, error } = await supabase.functions.invoke("match-supplier", {
      body: { lead_id: leadId },
    });
    setMatching(false);
    if (error) {
      toast.error("Leverandørmatch fejlede: " + error.message);
      return;
    }
    setSupplierMatches(data?.matches ?? []);
    if ((data?.matches ?? []).length === 0) {
      toast.info(data?.message || "Ingen matches fundet");
    } else {
      toast.success("Leverandørmatch fundet");
    }
  };

  const copyQuestion = (q: string) => {
    navigator.clipboard.writeText(q);
    toast.success("Kopieret til udklipsholder");
  };

  const hasAnalysis = !!aiAnalysisFlags?.analyzed_at;
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
          {/* Analyze button */}
          <Button
            variant="outline"
            size="sm"
            onClick={runAnalysis}
            disabled={analyzing}
            className="w-full"
          >
            {analyzing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            {hasAnalysis ? "Kør analyse igen" : "Analysér med AI"}
          </Button>

          {/* Flags & Category */}
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

          {/* Suggested questions */}
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

          {/* Price estimation */}
          <div className="border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={runPriceEstimate}
              disabled={estimating}
              className="w-full"
            >
              {estimating ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Calculator className="h-3.5 w-3.5 mr-1.5" />
              )}
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
              </div>
            )}
          </div>

          {/* Supplier matching */}
          <div className="border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={runSupplierMatch}
              disabled={matching}
              className="w-full"
            >
              {matching ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Users className="h-3.5 w-3.5 mr-1.5" />
              )}
              Find bedste leverandør
            </Button>

            {supplierMatches.length > 0 && (
              <div className="mt-3 space-y-2">
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