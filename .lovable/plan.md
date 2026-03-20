

# Phase 2: AI Agent Activation

## Overview
Activate the AI core: document-based knowledge (RAG), automated lead analysis, and AI-powered price estimation. Uses Lovable AI Gateway with Gemini 2.5 Flash.

---

## 1. Database Migration

**New table: `knowledge_documents`**
- `id` UUID PK, `user_id` UUID, `name` TEXT, `file_path` TEXT, `content_text` TEXT, `embedding` VECTOR(768), `created_at` TIMESTAMPTZ
- RLS: authenticated users full access
- Enable pgvector extension

**New fields on `leads`**
- `category` TEXT (e.g. "slibning", "lakering", "nyanlæg")
- `ai_analysis_flags` JSONB (structured AI output: urgency reason, complexity reason, categorization)
- `suggested_price` JSONB (price range, explanation, confidence)
- Note: `urgency_flag`, `complexity_flag`, `suggested_questions` already exist

**Storage bucket**: `knowledge-docs` (private, for PDF/TXT/DOCX uploads)

---

## 2. Edge Functions

### `analyze-lead`
- Triggered from frontend when a lead is created/updated
- Fetches lead data, sends to Lovable AI Gateway (Gemini 2.5 Flash)
- AI returns structured output via tool calling: urgency flag, complexity flag, category, 3 suggested questions, analysis flags
- Updates the lead record with AI results

### `estimate-price`
- Triggered from "Beregn tilbudspris" button on LeadDetail
- Fetches lead data + RAG query on `knowledge_documents` (pgvector cosine similarity)
- Sends lead context + relevant pricing docs to Gemini 2.5 Flash
- Returns structured price range + explanation
- Stores result in `suggested_price` JSONB on lead

### `embed-document`
- Triggered after document upload
- Extracts text content, generates embedding via Lovable AI Gateway
- Stores text + embedding in `knowledge_documents`

---

## 3. Knowledge Base UI

New admin section accessible from Settings or sidebar:
- Upload documents (PDF, TXT, DOCX) to storage bucket
- List uploaded documents with name, date, delete action
- After upload, calls `embed-document` edge function to process
- Simple table view, no complex file browser

---

## 4. UI Enhancements

### Dashboard (`Dashboard.tsx`)
- Show AI category badge on lead cards (e.g. "Slibning")
- Urgency icon (flame/alert) on AI-flagged leads
- Complexity icon on flagged leads

### LeadDetail (`LeadDetail.tsx`)
- New "AI Indsigter" collapsible panel:
  - Category badge
  - Urgency/complexity flags with AI reasoning
  - Suggested questions list (clickable to copy)
- "Beregn tilbudspris" button
  - Shows loading state while AI processes
  - Displays price range (e.g. "8.500 - 12.000 kr") and explanation
- AI results persist in DB, shown on reload

### SupplierList (`SupplierList.tsx`)
- "AI Leverandørmatch" button per lead context
- Uses lead location + job type to suggest best supplier from existing supplier data
- Calls a simple edge function that matches against supplier `cities_served` and `skills`

---

## 5. Implementation Order

1. Database migration (pgvector, knowledge_documents table, new lead fields, storage bucket)
2. `embed-document` edge function + Knowledge Base upload UI
3. `analyze-lead` edge function + wire into LeadCreate/LeadDetail
4. `estimate-price` edge function + LeadDetail price panel
5. Dashboard AI badges and icons
6. Supplier matching (lightweight, last priority)

---

## Technical Notes

- All AI calls go through Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) via edge functions — never from client
- Model: `google/gemini-2.5-flash` (fast, good reasoning, cost-effective)
- Structured output uses tool calling (not JSON mode) for deterministic pricing results
- pgvector embeddings generated via the AI gateway's embedding-compatible endpoint
- LOVABLE_API_KEY is already configured as a secret
- Document text extraction: for MVP, support plain text and simple parsing; full PDF parsing can be enhanced later

