
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create knowledge_documents table
CREATE TABLE public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content_text TEXT,
  embedding extensions.vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for knowledge_documents
CREATE POLICY "Authenticated users can view knowledge docs"
  ON public.knowledge_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert knowledge docs"
  ON public.knowledge_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete knowledge docs"
  ON public.knowledge_documents FOR DELETE TO authenticated USING (true);

-- Add new fields to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS ai_analysis_flags JSONB,
  ADD COLUMN IF NOT EXISTS suggested_price JSONB;

-- Create storage bucket for knowledge documents
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-docs', 'knowledge-docs', false);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload knowledge docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'knowledge-docs');
CREATE POLICY "Authenticated users can view knowledge docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'knowledge-docs');
CREATE POLICY "Authenticated users can delete knowledge docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'knowledge-docs');
