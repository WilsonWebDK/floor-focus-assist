import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Deterministic pricing constants (DKK)
const BASE_RATE_PER_SQM = 175;
const STAIR_RATE = 1500;
const DOORSTEP_RATE = 350;
const PARKING_SURCHARGE = 500;
const ELEVATOR_SURCHARGE = 800;
const MARGIN_PERCENT = 0.15;

function calculateDeterministicPrice(lead: any): { base: number; breakdown: string[]; total: number } {
  const sqm = lead.square_meters ? Number(lead.square_meters) : 0;
  const stairs = lead.stairs_count ?? 0;
  const doorsteps = lead.doorsteps_count ?? 0;
  const breakdown: string[] = [];
  let total = 0;

  if (sqm > 0) {
    const sqmCost = BASE_RATE_PER_SQM * sqm;
    total += sqmCost;
    breakdown.push(`Grundpris: ${sqm} m² × ${BASE_RATE_PER_SQM} kr. = ${sqmCost.toLocaleString("da-DK")} kr.`);
  }
  if (stairs > 0) {
    const stairCost = stairs * STAIR_RATE;
    total += stairCost;
    breakdown.push(`Trapper: ${stairs} × ${STAIR_RATE} kr. = ${stairCost.toLocaleString("da-DK")} kr.`);
  }
  if (doorsteps > 0) {
    const doorstepCost = doorsteps * DOORSTEP_RATE;
    total += doorstepCost;
    breakdown.push(`Dørtrin: ${doorsteps} × ${DOORSTEP_RATE} kr. = ${doorstepCost.toLocaleString("da-DK")} kr.`);
  }

  const parkingStatus = lead.parking_status || "";
  const parkingInfo = (lead.parking_info || "").toLowerCase();
  if (parkingStatus === "paid" || parkingStatus === "permit_required" || parkingInfo.includes("svær") || parkingInfo.includes("ingen") || parkingInfo.includes("langt")) {
    total += PARKING_SURCHARGE;
    breakdown.push(`Parkering (besværlig): ${PARKING_SURCHARGE} kr.`);
  }

  const floorLevel = lead.floor_level ?? 0;
  const hasElevator = lead.has_elevator ?? false;
  const elevatorInfo = (lead.elevator_info || "").toLowerCase();
  if ((floorLevel > 0 && !hasElevator) || (elevatorInfo && (elevatorInfo.includes("ingen") || elevatorInfo.includes("nej")))) {
    total += ELEVATOR_SURCHARGE;
    breakdown.push(`Ingen elevator (etage ${floorLevel}): ${ELEVATOR_SURCHARGE} kr.`);
  }

  return { base: BASE_RATE_PER_SQM, breakdown, total };
}

// Keyword-based document search for RAG
function findRelevantDocs(docs: any[], lead: any): { name: string; excerpt: string }[] {
  const keywords: string[] = [];
  if (lead.job_type) keywords.push(...lead.job_type.toLowerCase().split(/\s+/));
  if (lead.floor_type) keywords.push(...lead.floor_type.toLowerCase().split(/\s+/));
  if (lead.treatment_preference) keywords.push(...lead.treatment_preference.toLowerCase().split(/\s+/));
  if (lead.desired_look) keywords.push(...lead.desired_look.toLowerCase().split(/\s+/));
  if (lead.quality_expectation) keywords.push(...lead.quality_expectation.toLowerCase().split(/\s+/));

  // Filter out short/common words
  const filtered = keywords.filter(k => k.length > 2);

  if (filtered.length === 0) {
    // Return all docs if no keywords
    return docs.map(d => ({ name: d.name, excerpt: d.content_text?.substring(0, 2000) || "" }));
  }

  // Score docs by keyword matches
  const scored = docs.map(d => {
    const text = (d.content_text || "").toLowerCase();
    const score = filtered.reduce((acc: number, kw: string) => acc + (text.includes(kw) ? 1 : 0), 0);
    return { ...d, score };
  });

  // Sort by score desc, take top 5 with score > 0, fallback to all if none match
  const relevant = scored.filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  const selected = relevant.length > 0 ? relevant : docs.slice(0, 5);

  return selected.map(d => ({ name: d.name, excerpt: d.content_text?.substring(0, 2500) || "" }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lead_id, extra_context } = await req.json();
    if (!lead_id) throw new Error("lead_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();
    if (leadErr || !lead) throw new Error("Lead not found");

    const calc = calculateDeterministicPrice(lead);
    const hasSqm = lead.square_meters && Number(lead.square_meters) > 0;

    let priceMin: number;
    let priceMax: number;
    let confidence: string;

    if (!hasSqm) {
      priceMin = 0;
      priceMax = 0;
      confidence = "lav";
    } else {
      priceMin = Math.round(calc.total * (1 - MARGIN_PERCENT));
      priceMax = Math.round(calc.total * (1 + MARGIN_PERCENT));
      confidence = calc.breakdown.length >= 3 ? "høj" : "middel";
    }

    // RAG: fetch and rank knowledge docs
    const { data: allDocs } = await supabase
      .from("knowledge_documents")
      .select("name, content_text")
      .not("content_text", "is", null)
      .limit(20);

    const relevantDocs = allDocs ? findRelevantDocs(allDocs, lead) : [];
    const appliedRules: string[] = relevantDocs.map(d => d.name);

    let knowledgeContext = "";
    if (relevantDocs.length > 0) {
      knowledgeContext = "\n\nRelevante prisregler fra vidensbasen (SOP'er):\n" +
        relevantDocs.map(d => `--- ${d.name} ---\n${d.excerpt}`).join("\n\n");
    }

    const prompt = `Du er en prisassistent. Vi har allerede beregnet prisen deterministisk. Din opgave er KUN at:
1. Formatere en kort, venlig forklaring af prisberegningen
2. Vurdere om der mangler oplysninger for et mere præcist estimat
3. Hvis vidensbasen indeholder prisregler, nævn hvilke regler der er anvendt
4. IKKE ændre tallene — brug de angivne tal direkte

Deterministisk beregning:
${calc.breakdown.length > 0 ? calc.breakdown.join("\n") : "Kvadratmeter ikke angivet — kan ikke beregne."}
Total: ${calc.total > 0 ? `${calc.total.toLocaleString("da-DK")} kr.` : "Ikke beregnet"}
Prisinterval: ${priceMin > 0 ? `${priceMin.toLocaleString("da-DK")} – ${priceMax.toLocaleString("da-DK")} kr.` : "Kan ikke beregnes"}

Kundedata:
- Opgavetype: ${lead.job_type || "ikke angivet"}
- Gulvtype: ${lead.floor_type || "ikke angivet"}
- Behandling: ${lead.treatment_preference || "ikke angivet"}
- Kategori: ${lead.category || "ikke kategoriseret"}
- Gulvhistorik: ${lead.floor_history || "ikke angivet"}
- Ønsket udseende: ${lead.desired_look || "ikke angivet"}
- Kvalitetsforventning: ${lead.quality_expectation || "ikke angivet"}
${extra_context ? `\nEkstra info fra sælger: ${extra_context}` : ""}
${knowledgeContext}

Skriv en kort forklaring på dansk. Nævn hvad der er medregnet og hvilke SOP-regler der er brugt.${extra_context ? " Tag højde for den ekstra info fra sælgeren i din vurdering." : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Du er en dansk gulvslibnings-prisassistent. Du formaterer og forklarer prisberegninger. Du ændrer ALDRIG de beregnede tal." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "format_price_result",
              description: "Returnér formateret prisforklaring",
              parameters: {
                type: "object",
                properties: {
                  explanation: { type: "string", description: "Forklaring af prisberegningen på dansk, inkl. hvilke SOP-regler der er brugt" },
                  missing_for_accuracy: { type: "string", description: "Hvilke oplysninger mangler for et mere præcist estimat" },
                },
                required: ["explanation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "format_price_result" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI-tjenesten er midlertidigt overbelastet. Prøv igen om lidt." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-kreditter opbrugt." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let explanation = calc.breakdown.join(". ");
    let missingInfo = "";

    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      explanation = parsed.explanation || explanation;
      missingInfo = parsed.missing_for_accuracy || "";
    }

    const priceEstimate = {
      price_min: priceMin || null,
      price_max: priceMax || null,
      confidence,
      explanation,
      missing_for_accuracy: missingInfo || undefined,
      applied_rules: appliedRules.length > 0 ? appliedRules : undefined,
      estimated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from("leads")
      .update({ suggested_price: priceEstimate })
      .eq("id", lead_id);
    if (updateErr) console.error("Failed to save price estimate:", updateErr);

    return new Response(JSON.stringify({ success: true, estimate: priceEstimate }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("estimate-price error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
