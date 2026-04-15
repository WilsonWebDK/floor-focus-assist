const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: lead, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (error || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let score = 0;

    // 1. Square meters weight (0-7)
    const sqm = Number(lead.square_meters) || 0;
    if (sqm >= 150) score += 7;
    else if (sqm >= 80) score += 5;
    else if (sqm >= 30) score += 3;
    else if (sqm > 0) score += 1;

    // 2. Postal code bonus — Nordsjælland (29xx, 34xx, 28xx) = +2
    const pc = lead.postal_code || "";
    if (/^(29|34|28)\d{2}$/.test(pc)) {
      score += 2;
    }

    // 3. Urgency bonus
    if (lead.urgency_flag) {
      score += 1;
    }

    // 4. High-value job types from category
    const cat = (lead.category || "").toLowerCase();
    if (cat.includes("slibning") || cat.includes("terrasse") || cat.includes("lægning")) {
      score += 1;
    }

    // Normalize to 0-10
    const finalScore = Math.min(10, Math.max(0, score));

    // Update lead
    await supabase
      .from("leads")
      .update({ calculated_lead_score: finalScore })
      .eq("id", lead_id);

    return new Response(
      JSON.stringify({ score: finalScore, lead_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
