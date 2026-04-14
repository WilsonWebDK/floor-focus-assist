import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateQuizSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  for (const b of arr) slug += chars[b % chars.length];
  return slug;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Map Elementor/Make.com fields to our schema
    const squareMeters = body.m2 ?? body.square_meters ?? body.sqm ?? null;
    const imageUrls: string[] = [];

    // Handle file_upload — can be a string URL or array of URLs
    if (body.file_upload) {
      if (Array.isArray(body.file_upload)) {
        imageUrls.push(...body.file_upload);
      } else if (typeof body.file_upload === "string") {
        imageUrls.push(body.file_upload);
      }
    }
    if (body.image_urls) {
      if (Array.isArray(body.image_urls)) {
        imageUrls.push(...body.image_urls);
      }
    }

    const quizSlug = generateQuizSlug();

    const leadData: Record<string, any> = {
      name: body.name || "Ukendt",
      phone: body.phone || body.tel || null,
      email: body.email || null,
      address: body.address || body.adresse || null,
      city: body.city || body.by || null,
      postal_code: body.postal_code || body.postnummer || body.zip || null,
      source: body.source || "website_form",
      job_type: body.job_type || body.opgavetype || null,
      square_meters: squareMeters ? Number(squareMeters) : null,
      floor_type: body.floor_type || body.gulvtype || null,
      treatment_preference: body.treatment_preference || body.behandling || null,
      lead_message: body.message || body.lead_message || body.besked || null,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
      quiz_slug: quizSlug,
      floor_level: body.floor_level ? Number(body.floor_level) : 0,
      has_elevator: body.has_elevator ?? false,
      desired_look: body.desired_look || null,
      floor_history: body.floor_history || null,
      urgency_status: body.urgency_status || null,
    };

    const { data: lead, error } = await supabase
      .from("leads")
      .insert(leadData)
      .select("id, name, source, email")
      .single();

    if (error) throw error;

    // Fire analyze-lead
    supabase.functions.invoke("analyze-lead", {
      body: { lead_id: lead.id },
    }).catch((err: Error) => console.error("Auto-analyze failed:", err));

    // Fire outgoing webhooks
    supabase.functions.invoke("fire-webhook", {
      body: {
        event_type: "lead_created",
        payload: { id: lead.id, name: lead.name, source: lead.source },
      },
    }).catch((err: Error) => console.error("Webhook fire failed:", err));

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: lead.id,
        quiz_slug: quizSlug,
        quiz_url: `https://profgulve.lovable.app/?id=${quizSlug}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("receive-lead error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
