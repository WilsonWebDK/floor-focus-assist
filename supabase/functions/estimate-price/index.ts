import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Deterministic pricing constants (DKK)
const BASE_RATE_PER_SQM = 175; // base rate for standard sanding
const STAIR_RATE = 1500; // per staircase
const DOORSTEP_RATE = 350; // per doorstep
const PARKING_SURCHARGE = 500; // difficult parking
const ELEVATOR_SURCHARGE = 800; // no elevator in multi-story
const MARGIN_PERCENT = 0.15; // ±15% for min/max range

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

  // Parking surcharge
  const parkingInfo = (lead.parking_info || "").toLowerCase();
  if (parkingInfo && (parkingInfo.includes("svær") || parkingInfo.includes("ingen") || parkingInfo.includes("langt"))) {
    total += PARKING_SURCHARGE;
    breakdown.push(`Parkering (besværlig): ${PARKING_SURCHARGE} kr.`);
  }

  // Elevator surcharge
  const elevatorInfo = (lead.elevator_info || "").toLowerCase();
  if (elevatorInfo && (elevatorInfo.includes("ingen") || elevatorInfo.includes("nej"))) {
    total += ELEVATOR_SURCHARGE;
    breakdown.push(`Ingen elevator: ${ELEVATOR_SURCHARGE} kr.`);
  }

  return { base: BASE_RATE_PER_SQM, breakdown, total };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lead_id } = await req.json();
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

    // Deterministic calculation
    const calc = calculateDeterministicPrice(lead);
    const hasSqm = lead.square_meters && Number(lead.square_meters) > 0;

    let priceMin: number;
    let priceMax: number;
    let confidence: string;

    if (!hasSqm) {
      // Can't calculate without square meters - use AI estimate only
      priceMin = 0;
      priceMax = 0;
      confidence = "lav";
    } else {
      priceMin = Math.round(calc.total * (1 - MARGIN_PERCENT));
      priceMax = Math.round(calc.total * (1 + MARGIN_PERCENT));
      confidence = calc.breakdown.length >= 3 ? "høj" : "middel";
    }

    // RAG: fetch knowledge docs for additional context
    let knowledgeContext = "";
    const { data: docs } = await supabase
      .from("knowledge_documents")
      .select("name, content_text")
      .not("content_text", "is", null)
      .limit(10);

    if (docs && docs.length > 0) {
      knowledgeContext = "\n\nRelevante forretningsregler fra vidensbasen:\n" +
        docs.map((d) => `--- ${d.name} ---\n${d.content_text?.substring(0, 2000)}`).join("\n\n");
    }

    // Send deterministic result to AI ONLY for formatting/explanation
    const prompt = `Du er en prisassistent. Vi har allerede beregnet prisen deterministisk. Din opgave er KUN at:
1. Formatere en kort, venlig forklaring af prisberegningen
2. Vurdere om der mangler oplysninger for et mere præcist estimat
3. IKKE ændre tallene — brug de angivne tal direkte

Deterministisk beregning:
${calc.breakdown.length > 0 ? calc.breakdown.join("\n") : "Kvadratmeter ikke angivet — kan ikke beregne."}
Total: ${calc.total > 0 ? `${calc.total.toLocaleString("da-DK")} kr.` : "Ikke beregnet"}
Prisinterval: ${priceMin > 0 ? `${priceMin.toLocaleString("da-DK")} – ${priceMax.toLocaleString("da-DK")} kr.` : "Kan ikke beregnes"}

Kundedata:
- Opgavetype: ${lead.job_type || "ikke angivet"}
- Gulvtype: ${lead.floor_type || "ikke angivet"}
- Behandling: ${lead.treatment_preference || "ikke angivet"}
- Kategori: ${lead.category || "ikke kategoriseret"}
${knowledgeContext}

Skriv en kort forklaring på dansk. Nævn hvad der er medregnet. Angiv hvad der mangler.`;

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
                  explanation: { type: "string", description: "Forklaring af prisberegningen på dansk" },
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
      estimated_at: new Date().toISOString(),
    };

    // Save to lead
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
