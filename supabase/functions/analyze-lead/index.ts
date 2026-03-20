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

    const prompt = `Du er en ekspert i gulvslibning og gulvbehandling i Danmark. Analysér denne kundeforespørgsel og giv din vurdering.

Kundedata:
- Navn: ${lead.name}
- By: ${lead.city || "ukendt"}
- Postnummer: ${lead.postal_code || "ukendt"}
- Opgavetype: ${lead.job_type || "ikke angivet"}
- Kvadratmeter: ${lead.square_meters || "ikke angivet"}
- Gulvtype: ${lead.floor_type || "ikke angivet"}
- Ønsket behandling: ${lead.treatment_preference || "ikke angivet"}
- Antal trapper: ${lead.stairs_count ?? 0}
- Antal dørtrin: ${lead.doorsteps_count ?? 0}
- Parkering: ${lead.parking_info || "ikke angivet"}
- Elevator: ${lead.elevator_info || "ikke angivet"}
- Kundebesked: ${lead.lead_message || "ingen besked"}

Vurdér følgende og kald funktionen med dit resultat.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Du er en dansk gulvslibnings-CRM assistent. Svar altid på dansk. Vær konkret og præcis." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_lead",
              description: "Returnér struktureret analyse af et lead",
              parameters: {
                type: "object",
                properties: {
                  urgency_flag: { type: "boolean", description: "Om opgaven haster (kort tidsfrist, vandskade, etc.)" },
                  urgency_reason: { type: "string", description: "Kort begrundelse for hastemarkering (dansk)" },
                  complexity_flag: { type: "boolean", description: "Om opgaven er kompleks (trapper, specielle gulve, store arealer, etc.)" },
                  complexity_reason: { type: "string", description: "Kort begrundelse for kompleksitet (dansk)" },
                  category: { type: "string", description: "Hovedkategori: slibning, lakering, oliering, nyanlæg, reparation, andet" },
                  suggested_questions: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 målrettede spørgsmål at stille kunden for at kvalificere leadet (dansk)",
                  },
                  missing_info_summary: { type: "string", description: "Kort opsummering af manglende information (dansk)" },
                },
                required: ["urgency_flag", "complexity_flag", "category", "suggested_questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_lead" } },
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
        return new Response(JSON.stringify({ error: "AI-kreditter opbrugt. Kontakt administrator." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const analysis = JSON.parse(toolCall.function.arguments);

    // Update lead with AI analysis
    const updateData: Record<string, unknown> = {
      urgency_flag: analysis.urgency_flag,
      complexity_flag: analysis.complexity_flag,
      category: analysis.category,
      suggested_questions: analysis.suggested_questions,
      ai_analysis_flags: {
        urgency_reason: analysis.urgency_reason || null,
        complexity_reason: analysis.complexity_reason || null,
        category: analysis.category,
        analyzed_at: new Date().toISOString(),
      },
    };
    if (analysis.missing_info_summary) {
      updateData.missing_info_summary = analysis.missing_info_summary;
    }

    const { error: updateErr } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", lead_id);
    if (updateErr) throw new Error("Failed to update lead: " + updateErr.message);

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-lead error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
