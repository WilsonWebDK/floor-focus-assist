import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { document_id } = await req.json();
    if (!document_id) throw new Error("document_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get document record
    const { data: doc, error: docErr } = await supabase
      .from("knowledge_documents")
      .select("*")
      .eq("id", document_id)
      .single();
    if (docErr || !doc) throw new Error("Document not found");

    // Download file from storage
    const { data: fileData, error: fileErr } = await supabase
      .storage
      .from("knowledge-docs")
      .download(doc.file_path);
    if (fileErr || !fileData) throw new Error("Could not download file: " + (fileErr?.message || "unknown"));

    // Extract text content based on file type
    let textContent = "";
    const fileName = doc.name.toLowerCase();

    if (fileName.endsWith(".txt") || fileName.endsWith(".md") || fileName.endsWith(".csv")) {
      textContent = await fileData.text();
    } else if (fileName.endsWith(".pdf") || fileName.endsWith(".docx")) {
      // For MVP: extract raw text. PDF/DOCX will have limited extraction.
      // Try to get text - for binary formats this may be partial
      try {
        textContent = await fileData.text();
        // Clean up binary artifacts for PDF
        if (fileName.endsWith(".pdf")) {
          // Extract readable strings from PDF text
          textContent = textContent
            .replace(/[^\x20-\x7E\xC0-\xFF\n\r\tæøåÆØÅ]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        }
      } catch {
        textContent = "[Kunne ikke udtrække tekst fra denne fil]";
      }
    } else {
      textContent = await fileData.text();
    }

    // Truncate to reasonable size for embedding
    const maxChars = 8000;
    if (textContent.length > maxChars) {
      textContent = textContent.substring(0, maxChars);
    }

    // Use AI to summarize and create a useful text representation
    const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Du modtager indhold fra et dokument. Bevar alt vigtigt indhold men fjern formatering og støj. Returnér ren tekst." },
          { role: "user", content: `Ryd op i dette dokumentindhold og bevar alle fakta, priser, regler og vigtig information:\n\n${textContent}` },
        ],
      }),
    });

    let cleanedText = textContent;
    if (summaryResponse.ok) {
      const summaryResult = await summaryResponse.json();
      const content = summaryResult.choices?.[0]?.message?.content;
      if (content) cleanedText = content;
    }

    // Update document with extracted text (skip embedding for MVP - use text search instead)
    const { error: updateErr } = await supabase
      .from("knowledge_documents")
      .update({ content_text: cleanedText })
      .eq("id", document_id);
    if (updateErr) throw new Error("Failed to update document: " + updateErr.message);

    return new Response(JSON.stringify({ success: true, text_length: cleanedText.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("embed-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
