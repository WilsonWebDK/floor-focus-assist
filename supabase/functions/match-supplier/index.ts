import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { lead_id } = await req.json();
    if (!lead_id) throw new Error("lead_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [leadRes, suppliersRes] = await Promise.all([
      supabase.from("leads").select("*").eq("id", lead_id).single(),
      supabase.from("suppliers").select("*"),
    ]);

    if (leadRes.error) throw new Error("Lead not found");
    const lead = leadRes.data;
    const suppliers = suppliersRes.data ?? [];

    if (suppliers.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: "Ingen leverandører registreret" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supplierSummary = suppliers
      .map(
        (s: any) =>
          `ID:${s.id} | Navn:${s.name} | Byer:${(s.cities_served ?? []).join(",")} | Kompetencer:${(s.skills ?? []).join(",")} | Kvalitet:${s.quality_score ?? "?"}/10 | Pris:${s.price_level ?? "?"} | Snedker:${s.can_do_carpentry ? "ja" : "nej"} | Dansk:${s.speaks_good_danish ? "ja" : "nej"}`,
      )
      .join("\n");

    const leadContext = `Lead: ${lead.name}, By: ${lead.city ?? "ukendt"}, Opgave: ${lead.job_type ?? "ukendt"}, Gulvtype: ${lead.floor_type ?? "ukendt"}, Areal: ${lead.square_meters ?? "ukendt"} m², Kategori: ${(lead as any).category ?? "ukendt"}`;

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Du er en ekspert i at matche gulvbehandlings-leads med de bedste underleverandører. Analysér leadet og leverandørlisten, og returnér de 3 bedste matches via tool calling. Vurder baseret på: by-match, relevante kompetencer, kvalitetsscore og prisniveau.",
            },
            {
              role: "user",
              content: `${leadContext}\n\nTilgængelige leverandører:\n${supplierSummary}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_matches",
                description: "Return top 3 supplier matches with score and reasoning",
                parameters: {
                  type: "object",
                  properties: {
                    matches: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          supplier_id: { type: "string" },
                          name: { type: "string" },
                          score: {
                            type: "number",
                            description: "Match score 1-10",
                          },
                          reason: {
                            type: "string",
                            description: "Short reasoning in Danish",
                          },
                        },
                        required: ["supplier_id", "name", "score", "reason"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["matches"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "return_matches" },
          },
        }),
      },
    );

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit nået, prøv igen om lidt" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402)
        return new Response(JSON.stringify({ error: "Kreditgrænse nået" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const matches = toolCall
      ? JSON.parse(toolCall.function.arguments).matches
      : [];

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("match-supplier error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
