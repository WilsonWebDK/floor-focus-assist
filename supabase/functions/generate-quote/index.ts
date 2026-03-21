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

    // Fetch lead
    const { data: lead, error: leadErr } = await supabase.from("leads").select("*").eq("id", lead_id).single();
    if (leadErr || !lead) throw new Error("Lead not found");

    // Fetch active template
    const { data: templates } = await supabase.from("sales_templates").select("*").eq("is_active", true).limit(1);
    const template = templates?.[0];

    if (!template) {
      return new Response(JSON.stringify({ error: "Ingen aktiv salgsskabelon fundet. Opret en under Indstillinger." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Replace placeholders
    const price = lead.suggested_price as any;
    const priceStr = price?.price_min && price?.price_max
      ? `${price.price_min.toLocaleString("da-DK")} – ${price.price_max.toLocaleString("da-DK")} kr.`
      : "Pris oplyses efter besigtigelse";

    let mergedContent = template.content
      .replace(/\{\{customer_name\}\}/g, lead.name || "")
      .replace(/\{\{job_type\}\}/g, lead.job_type || "gulvbehandling")
      .replace(/\{\{estimated_price\}\}/g, priceStr)
      .replace(/\{\{suggested_treatment\}\}/g, lead.treatment_preference || "aftales efter besigtigelse")
      .replace(/\{\{square_meters\}\}/g, lead.square_meters ? `${lead.square_meters} m²` : "ikke opgivet")
      .replace(/\{\{city\}\}/g, lead.city || "")
      .replace(/\{\{floor_type\}\}/g, lead.floor_type || "ikke opgivet")
      .replace(/\{\{address\}\}/g, [lead.address, lead.postal_code, lead.city].filter(Boolean).join(", ") || "");

    // Send to AI for tone refinement
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Du er en professionel salgsskribent for en dansk gulvslibningsvirksomhed. Forbedre den følgende skabelon til et professionelt og venligt tilbud. Behold alle fakta og priser UÆNDREDE. Du må IKKE ændre nogen tal eller priser. Skriv på dansk. Returner kun den færdige tekst.",
          },
          {
            role: "user",
            content: `Forbedr denne tilbudstekst:\n\n${mergedContent}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_quote",
              description: "Returnér det færdige tilbud",
              parameters: {
                type: "object",
                properties: {
                  quote_text: { type: "string", description: "Det fulde færdige tilbud, klar til at sende til kunden" },
                },
                required: ["quote_text"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_quote" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI-tjenesten er midlertidigt overbelastet." }), {
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

    let { quote_text } = JSON.parse(toolCall.function.arguments);

    // Append disclaimer verbatim (never passed through AI)
    const disclaimer = template.disclaimer as string | null;
    if (disclaimer && disclaimer.trim()) {
      quote_text = quote_text + "\n\n---\n" + disclaimer.trim();
    }

    // Save to lead
    await supabase.from("leads").update({ quote_content: quote_text }).eq("id", lead_id);

    return new Response(JSON.stringify({ success: true, quote_text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quote error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
