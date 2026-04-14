import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, FileText, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";

interface KnowledgeDoc {
  id: string;
  name: string;
  file_path: string;
  content_text: string | null;
  created_at: string;
}

export default function KnowledgeBase() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadDocs = async () => {
    const { data } = await supabase
      .from("knowledge_documents")
      .select("id, name, file_path, content_text, created_at")
      .order("created_at", { ascending: false });
    setDocs((data as KnowledgeDoc[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowed = [".txt", ".md", ".csv", ".pdf", ".docx"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error("Filtype ikke understøttet. Brug TXT, MD, CSV, PDF eller DOCX.");
      return;
    }

    setUploading(true);
    const filePath = `${user.id}/${Date.now()}_${file.name}`;

    const { error: storageErr } = await supabase.storage
      .from("knowledge-docs")
      .upload(filePath, file);
    if (storageErr) {
      toast.error("Kunne ikke uploade fil: " + storageErr.message);
      setUploading(false);
      return;
    }

    const { data: docRecord, error: dbErr } = await supabase
      .from("knowledge_documents")
      .insert({ user_id: user.id, name: file.name, file_path: filePath })
      .select("id")
      .single();
    if (dbErr || !docRecord) {
      toast.error("Kunne ikke registrere dokument");
      setUploading(false);
      return;
    }

    supabase.functions.invoke("embed-document", {
      body: { document_id: docRecord.id },
    }).then(({ error }) => {
      if (error) console.error("Embed error:", error);
      else toast.success("Dokument behandlet af AI");
      loadDocs();
    });

    toast.success("Dokument uploadet — AI behandler indholdet...");
    setUploading(false);
    loadDocs();
    e.target.value = "";
  };

  const viewDoc = async (doc: KnowledgeDoc) => {
    const { data, error } = await supabase.storage
      .from("knowledge-docs")
      .createSignedUrl(doc.file_path, 3600);
    if (error || !data?.signedUrl) {
      toast.error("Kunne ikke åbne dokument");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const deleteDoc = async (doc: KnowledgeDoc) => {
    if (!confirm(`Slet "${doc.name}"?`)) return;
    await supabase.storage.from("knowledge-docs").remove([doc.file_path]);
    await supabase.from("knowledge_documents").delete().eq("id", doc.id);
    toast.success("Dokument slettet");
    loadDocs();
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Vidensbase (AI)
        </h2>
        <label>
          <input
            type="file"
            className="hidden"
            accept=".txt,.md,.csv,.pdf,.docx"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button variant="outline" size="sm" asChild disabled={uploading}>
            <span className="cursor-pointer">
              {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
              Upload dokument
            </span>
          </Button>
        </label>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Upload prisregler, forretningsdokumenter og referencemateriale. AI bruger dem til at analysere leads og beregne priser.
      </p>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-6 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Ingen dokumenter endnu. Upload filer for at give AI kontekst.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-shadow"
            >
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: da })}
                  {doc.content_text ? " · Behandlet" : " · Afventer behandling..."}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => viewDoc(doc)} className="shrink-0" title="Vis dokument">
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => deleteDoc(doc)} className="text-destructive hover:text-destructive shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
