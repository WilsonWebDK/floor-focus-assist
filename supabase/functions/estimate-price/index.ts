import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // RAG: fetch relevant knowledge documents
    let knowledgeContext = "";
    const { data: docs } = await supabase
      .from("knowledge_documents")
      .select("name, content_text")
      .not("content_text", "is", null)
      .limit(10);

    if (docs && docs.length > 0) {
      knowledgeContext = "\n\nRelevante forretningsregler og prisoplysninger fra vidensbasen:\n" +
        docs.map((d) => `--- ${d.name} ---\n${d.content_text?.substring(0, 2000)}`).join("\n\n");
    }

    const prompt = `Du er en prisberegningsassistent for en dansk gulvslibningsvirksomhed. Baseret på kundedata og evt. forretningsregler, giv et prisoverslag.

Kundedata:
- Opgavetype: ${lead.job_type || "ikke angivet"}
- Kvadratmeter: ${lead.square_meters || "ikke angivet"}
- Gulvtype: ${lead.floor_type || "ikke angivet"}
- Ønsket behandling: ${lead.treatment_preference || "ikke angivet"}
- Antal trapper: ${lead.stairs_count ?? 0}
- Antal dørtrin: ${lead.doorsteps_count ?? 0}
- By: ${lead.city || "ukendt"}
- Kategori: ${lead.category || "ikke kategoriseret"}
- Kompleksitet: ${lead.complexity_flag ? "Ja" : "Nej"}
${knowledgeContext}

Giv et realistisk prisoverslag for denne opgave. Hvis der mangler vigtige oplysninger, angiv det. Brug altid danske kroner (kr.).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Du er en dansk gulvslibnings-prisberegner. Vær konservativ og realistisk. Svar altid på dansk." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "estimate_price",
              description: "Returnér struktureret prisoverslag",
              parameters: {
                type: "object",
                properties: {
                  price_min: { type: "number", description: "Minimum pris i DKK" },
                  price_max: { type: "number", description: "Maksimum pris i DKK" },
                  confidence: { type: "string", enum: ["høj", "middel", "lav"], description: "Hvor sikker er du på estimatet" },
                  explanation: { type: "string", description: "Forklaring af prisberegningen på dansk, inkl. hvad der er medregnet" },
                  missing_for_accuracy: { type: "string", description: "Hvilke oplysninger mangler for et mere præcist estimat" },
                },
                required: ["price_min", "price_max", "confidence", "explanation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "estimate_price" } },
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
    if (!toolCall) throw new Error("No tool call in AI response");

    const priceEstimate = JSON.parse(toolCall.function.arguments);

    // Save to lead
    const { error: updateErr } = await supabase
      .from("leads")
      .update({
        suggested_price: {
          ...priceEstimate,
          estimated_at: new Date().toISOString(),
        },
      })
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
