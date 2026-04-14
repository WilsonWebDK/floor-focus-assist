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

    // Fetch knowledge base docs for grounded analysis
    let knowledgeContext = "";
    const { data: docs } = await supabase
      .from("knowledge_documents")
      .select("name, content_text")
      .not("content_text", "is", null)
      .limit(10);

    if (docs && docs.length > 0) {
      knowledgeContext = "\n\nRelevante forretningsdokumenter fra vidensbasen:\n" +
        docs.map((d: any) => `--- ${d.name} ---\n${d.content_text?.substring(0, 3000)}`).join("\n\n");
    }

    const prompt = `Du er en ekspert i gulvslibning og gulvbehandling i Danmark. Analysér denne kundeforespørgsel grundigt og giv en komplet salgsstrategi.

Kundedata:
- Navn: ${lead.name}
- By: ${lead.city || "ukendt"}
- Postnummer: ${lead.postal_code || "ukendt"}
- Adresse: ${lead.address || "ikke angivet"}
- Opgavetype: ${lead.job_type || "ikke angivet"}
- Kvadratmeter: ${lead.square_meters || "ikke angivet"}
- Gulvtype: ${lead.floor_type || "ikke angivet"}
- Ønsket behandling: ${lead.treatment_preference || "ikke angivet"}
- Antal trapper: ${lead.stairs_count ?? 0}
- Antal dørtrin: ${lead.doorsteps_count ?? 0}
- Etage: ${lead.floor_level ?? 0}
- Har elevator: ${lead.has_elevator ? "Ja" : "Nej/Ukendt"}
- Etageadskillelse: ${lead.floor_separation_type || "ikke angivet"}
- Parkering: ${lead.parking_info || "ikke angivet"} (status: ${lead.parking_status || "ukendt"})
- 13A strøm tilgængelig: ${lead.power_13a_available ? "Ja" : "Nej/Ukendt"}
- Gulvhistorik: ${lead.floor_history || "ikke angivet"}
- Ønsket udseende: ${lead.desired_look || "ikke angivet"}
- Hastegrad: ${lead.urgency_status || "ikke angivet"}
- Kvalitetsforventning: ${lead.quality_expectation || "ikke angivet"}
- Tidsramme: ${lead.time_requirement || "ikke angivet"}
- Antal billeder uploadet: ${(lead.image_urls || []).length}
- Kundebesked: ${lead.lead_message || "ingen besked"}
- Manglende info: ${lead.missing_info_summary || "ikke vurderet endnu"}
${knowledgeContext}

Giv en detaljeret analyse med salgsstrategi. Henvis specifikt til relevante SOP-dokumenter ved navn (f.eks. "Ifølge SOP for lakering…"). Brug viden fra forretningsdokumenterne til at understøtte dine anbefalinger.

Analysér også kundens besked og forsøg at udtrække konkrete tekniske data: kvadratmeter, etage og elevator-info. Returnér disse som suggested_sqm, suggested_floor_level og suggested_has_elevator hvis de kan udledes.

Skriv også et professionelt, venligt emailudkast til kunden på dansk. Emailen skal:
- Adressere kunden ved navn
- Referere til deres specifikke opgave (gulvtype, m², behandling)
- Nævne eventuelle tekniske forhold (etage, strøm, parkering) hvis relevant
- Være klar til at sende (med hilsen fra virksomheden)
- Undgå typiske AI-introsætninger som "Tak for din henvendelse". Skriv naturligt og professionelt som en erfaren håndværker der har læst kundens besked.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Du er en dansk gulvslibnings-CRM assistent. Svar altid på dansk. Vær konkret, præcis og handlingsorienteret. Henvis til SOP-dokumenter ved navn når du giver anbefalinger. Skriv emailudkast der lyder som en erfaren håndværker — ikke som en AI." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_lead",
              description: "Returnér struktureret analyse og salgsstrategi for et lead",
              parameters: {
                type: "object",
                properties: {
                  urgency_flag: { type: "boolean", description: "Om opgaven haster (kort tidsfrist, vandskade, etc.)" },
                  urgency_reason: { type: "string", description: "Kort begrundelse for hastemarkering (dansk)" },
                  complexity_flag: { type: "boolean", description: "Om opgaven er kompleks (trapper, specielle gulve, store arealer, etc.)" },
                  complexity_reason: { type: "string", description: "Kort begrundelse for kompleksitet (dansk)" },
                  category: { type: "string", description: "Hovedkategori: slibning, lakering, oliering, nyanlæg, reparation, andet" },
                  complexity_analysis: { type: "string", description: "Detaljeret analyse af opgavens kompleksitet. Henvis til relevante SOP-dokumenter ved navn. 3-5 sætninger på dansk." },
                  potential_challenges: { type: "string", description: "Potentielle risici og udfordringer. Henvis til SOP'er hvis relevant. 3-5 sætninger på dansk." },
                  recommended_approach: { type: "string", description: "Anbefalet salgsstrategi og udførelsesplan med SOP-referencer. 3-5 sætninger på dansk." },
                  suggested_questions: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 målrettede spørgsmål at stille kunden for at kvalificere leadet (dansk)",
                  },
                  missing_info_summary: { type: "string", description: "Kort opsummering af manglende information der er kritisk for prisberegning og planlægning (dansk)" },
                  suggested_draft: { type: "string", description: "Professionelt emailudkast til kunden på dansk. Personaliseret med kundens navn, opgavetype, m² og tekniske detaljer. Skriv som en erfaren håndværker, ikke en AI. Klar til afsendelse med venlig hilsen." },
                  suggested_sqm: { type: "number", description: "Udtrukket antal kvadratmeter fra kundens besked, eller null hvis ikke muligt" },
                  suggested_floor_level: { type: "number", description: "Udtrukket etage fra kundens besked, eller null hvis ikke muligt" },
                  suggested_has_elevator: { type: "boolean", description: "Udtrukket elevator-info fra kundens besked, eller null hvis ikke muligt" },
                },
                required: ["urgency_flag", "complexity_flag", "category", "complexity_analysis", "potential_challenges", "recommended_approach", "suggested_questions", "suggested_draft"],
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
        complexity_analysis: analysis.complexity_analysis || null,
        potential_challenges: analysis.potential_challenges || null,
        recommended_approach: analysis.recommended_approach || null,
        suggested_draft: analysis.suggested_draft || null,
        suggested_sqm: analysis.suggested_sqm ?? null,
        suggested_floor_level: analysis.suggested_floor_level ?? null,
        suggested_has_elevator: analysis.suggested_has_elevator ?? null,
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
