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
    const { event_type, payload } = await req.json();
    if (!event_type || !payload) throw new Error("event_type and payload required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get active webhook settings for this event type
    const { data: webhooks } = await supabase
      .from("webhook_settings")
      .select("*")
      .eq("event_type", event_type)
      .eq("is_active", true);

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ fired: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results = await Promise.allSettled(
      webhooks.map(async (wh: any) => {
        try {
          const res = await fetch(wh.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: event_type, data: payload, timestamp: new Date().toISOString() }),
          });

          const responseBody = await res.text().catch(() => "");

          await supabase.from("webhook_logs").insert({
            webhook_setting_id: wh.id,
            event_type,
            payload,
            status_code: res.status,
            response_body: responseBody.slice(0, 2000),
          });

          return { id: wh.id, status: res.status };
        } catch (err) {
          await supabase.from("webhook_logs").insert({
            webhook_setting_id: wh.id,
            event_type,
            payload,
            status_code: 0,
            response_body: err instanceof Error ? err.message : "Network error",
          });
          return { id: wh.id, status: 0 };
        }
      }),
    );

    return new Response(
      JSON.stringify({ fired: webhooks.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("fire-webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
