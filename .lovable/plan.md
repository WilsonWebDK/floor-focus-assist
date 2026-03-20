

# Phase 3 Complete: Agentic Polish

## Overview
Priority dashboard with scoring, sales template/quote generator, webhook data mapping, auto supplier match, and cleanup of "Coming Soon" placeholders.

---

## 1. Database Migration

```sql
-- Sales templates table
CREATE TABLE public.sales_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sales_templates ENABLE ROW LEVEL SECURITY;
-- RLS: authenticated full CRUD

-- New lead fields
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS quote_content TEXT;
```

---

## 2. AI Priority Dashboard (`src/pages/Dashboard.tsx`)

Replace the current "Nye leads" list with a **Priority Feed**:
- Calculate priority score per lead: `urgency_flag` (+3), `complexity_flag` (+1), age > 2h with status "new" (+2), age > 24h (+3)
- Sort all non-closed leads by score descending
- Leads with score >= 3 get a pulsing red dot indicator
- Each card shows a one-line "Agent Recommendation" derived from `ai_analysis_flags` (e.g. urgency_reason or complexity_reason)
- Leads older than 24h with status "new" show a "Kritisk opfølgning" badge
- Keep existing widgets (Haster, Opfølgning, Påmindelser) but add the Priority Feed as the primary section

---

## 3. Sales Templates & Quote Generator

### Settings Page (`src/pages/Settings.tsx`)
- New "Salgsskabeloner" section with:
  - List existing templates (name, active toggle, edit/delete)
  - Create/edit form: name + content textarea with placeholder hints (`{{customer_name}}`, `{{job_type}}`, `{{estimated_price}}`, `{{suggested_treatment}}`, `{{square_meters}}`, `{{city}}`)
  - One template marked as "active" at a time

### New Edge Function: `generate-quote`
- Receives `lead_id`
- Fetches lead data + active sales template
- Merges placeholders with lead data
- Sends to Gemini 2.5 Flash to refine tone and fill gaps
- Returns polished quote text
- Saves to `leads.quote_content`

### LeadDetail (`src/pages/LeadDetail.tsx`)
- New "Generér tilbud" button in the AI panel
- Shows generated quote in a styled text block with copy-to-clipboard
- If `quote_content` exists, show it on reload
- No PDF generation (text-based quote for email/WhatsApp)

---

## 4. Webhook Data Mapping (`src/components/WebhookPanel.tsx`)

Add a "Feltmapping" section in the incoming webhooks area:
- Static table showing Elementor form field names → leads table columns
- Fields: name, phone, email, address, city, postal_code, job_type, floor_type, square_meters, lead_message
- Instructional text explaining how to map fields in Make.com's HTTP module

---

## 5. Automated Supplier Match (`src/components/LeadAiPanel.tsx`)

- On component mount, if no supplier matches are cached, auto-run `match-supplier`
- Show results inline (already have the UI for this)
- Add a "Anmod om tilgængelighed" button on the top match that creates a reminder linked to the lead with title "Tjek tilgængelighed: {supplier_name}"

---

## 6. Cleanup & Polish

- **Remove "Kommer snart" placeholders** from Settings integrations section (Google Calendar, Gmail) — keep the cards but remove the badge text, replace with "Ikke tilsluttet" neutral state
- **Internal notes**: Make the textarea auto-expanding with min 4 rows in edit mode
- **Estimate-price fix**: Update the edge function prompt to explicitly list `doorsteps_count`, `parking_info`, and `elevator_info` as price-increasing factors

---

## 7. Implementation Order

1. Database migration (sales_templates table, new lead fields)
2. Priority Dashboard rewrite
3. Sales Templates UI in Settings
4. `generate-quote` edge function
5. LeadDetail quote button integration
6. Webhook data mapping table
7. Auto supplier match + "Anmod om tilgængelighed"
8. Cleanup: remove Coming Soon badges, expand internal_notes, fix estimate-price prompt

---

## Technical Notes

- All AI calls use `google/gemini-2.5-flash` via Lovable AI Gateway
- Quote generation uses tool calling for structured output (quote_text field)
- Priority score is calculated client-side from existing lead fields — no new edge function needed
- The pulsing red indicator uses a CSS animation (`animate-pulse`) with `bg-red-500`
- Sales templates stored in DB with RLS; no file storage needed

