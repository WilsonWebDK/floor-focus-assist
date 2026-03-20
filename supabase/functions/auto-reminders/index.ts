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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find leads that are still 'new' and older than 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: staleLeads } = await supabase
      .from("leads")
      .select("id, name")
      .eq("status", "new")
      .lt("created_at", cutoff);

    if (!staleLeads || staleLeads.length === 0) {
      return new Response(
        JSON.stringify({ created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check existing reminders to avoid duplicates
    const leadIds = staleLeads.map((l: any) => l.id);
    const { data: existingReminders } = await supabase
      .from("reminders")
      .select("related_id")
      .in("related_id", leadIds)
      .eq("related_type", "lead")
      .eq("status", "pending");

    const existingSet = new Set((existingReminders ?? []).map((r: any) => r.related_id));

    const newReminders = staleLeads
      .filter((l: any) => !existingSet.has(l.id))
      .map((l: any) => ({
        title: `Opfølgning på nyt lead: ${l.name}`,
        description: "Automatisk oprettet — leadet har været 'Ny' i over 24 timer.",
        related_id: l.id,
        related_type: "lead",
        due_at: new Date().toISOString(),
        status: "pending",
      }));

    if (newReminders.length > 0) {
      await supabase.from("reminders").insert(newReminders);
    }

    return new Response(
      JSON.stringify({ created: newReminders.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("auto-reminders error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
