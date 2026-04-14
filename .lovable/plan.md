

# Step 3: AI Intelligence Engine & Knowledge Base RAG

## Current State
- `analyze-lead` already works with Gemini 2.5 Flash but only returns flags (urgency, complexity, category, suggested questions). No "Sales Strategy Rundown".
- `estimate-price` uses deterministic pricing + AI for formatting. It fetches knowledge docs via simple text search (no vector/embedding search). Knowledge docs are truncated to 2000 chars each.
- `embed-document` extracts text and uses AI to clean it, stores in `content_text`. The `embedding` column (pgvector) exists on `knowledge_documents` but is never populated.
- `KnowledgeBase.tsx` allows upload/delete but has no "View" button.
- `LeadAiPanel.tsx` shows flags, price, quote, and supplier match — but no structured "AI Analysis Rundown".
- `generate-quote` exists and works.

## Plan

### 1. Enhance `analyze-lead` Edge Function — Sales Strategy Rundown
- Expand the prompt to include ALL technical fields (floor_history, desired_look, power_13a, floor_level, has_elevator, parking_status, urgency_status, quality_expectation, time_requirement, image_urls count, missing_info_summary)
- Expand the tool schema to return structured rundown:
  - `complexity_analysis` (string) — detailed complexity breakdown
  - `potential_challenges` (string) — risks and issues to watch
  - `recommended_approach` (string) — suggested sales/execution strategy
  - Keep existing: urgency_flag, complexity_flag, category, suggested_questions, missing_info_summary
- Store the new fields in `ai_analysis_flags` JSON column (no migration needed)
- Include knowledge base context (fetch docs with content_text) in the prompt for grounded analysis

### 2. Enhance `estimate-price` Edge Function — RAG with Knowledge Base
- For now, keep using text-based search (pgvector embeddings are not populated, and setting up proper embedding generation would require an embedding model not available via Lovable AI gateway)
- Improve the knowledge doc selection: search for docs whose `content_text` contains keywords from the lead's job_type, floor_type, treatment_preference
- Pass more lead fields to the pricing context (floor_history, desired_look, quality_expectation)
- Return which knowledge docs were used in the price calculation as `applied_rules` array

### 3. KnowledgeBase.tsx — Add View Button
- Add a "View" button next to each document
- Generate a signed URL via `supabase.storage.from("knowledge-docs").createSignedUrl(doc.file_path, 3600)`
- Open in new tab for PDFs, or show in a Dialog/iframe for other types

### 4. Refactor LeadAiPanel.tsx — Prioritize AI Rundown
Restructure the panel layout:
1. **Top**: "Analysér med AI" button
2. **AI Analysis Rundown** (new section, always visible when analysis exists):
   - Complexity Analysis card
   - Potential Challenges card
   - Recommended Approach card
3. **Flags & Category** (existing, compact)
4. **Suggested Questions** (existing)
5. **Price Estimation** section — add `applied_rules` display showing which SOPs informed the price
6. **Quote Generation** — consolidate into single "Generér tilbud" button, add "Coming Soon: Slides Integration" badge
7. **Supplier Match** — keep existing but add "Coming Soon" badge to "Find bedste leverandør"

### 5. LeadDetail.tsx — Minor Updates
- Remove duplicate "PDF Tilbud" placeholder if it exists alongside the quote button
- Ensure the AI panel receives the new rundown data from `ai_analysis_flags`

## No Database Migration Needed
All new analysis data fits in the existing `ai_analysis_flags` (jsonb) column. No schema changes required.

## Files Modified
- `supabase/functions/analyze-lead/index.ts` — expanded prompt + tool schema + knowledge context
- `supabase/functions/estimate-price/index.ts` — keyword-based doc search + applied_rules output
- `src/components/KnowledgeBase.tsx` — add View button with signed URLs
- `src/components/LeadAiPanel.tsx` — restructured layout with AI Rundown, applied rules, Coming Soon badges
- `src/pages/LeadDetail.tsx` — pass new ai_analysis_flags fields to LeadAiPanel

