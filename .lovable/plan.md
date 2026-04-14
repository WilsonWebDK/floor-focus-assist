

# Step 4: Supplier Refinement, AI Auto-fill & Economic Automation

## What already exists
- Suppliers table has `price_level`, `quality_score`, `can_do_carpentry`, `speaks_good_danish`
- `analyze-lead` already returns structured analysis via tool calling, including `suggested_draft`
- `LeadAiPanel` has price estimation with `suggestedPrice` and "Apply" is not yet implemented
- LeadDetail has admin-only Economics section with Tilbudspris/Omkostninger/Profit
- Image gallery already exists in LeadDetail
- `MissingInfoChecklist` checks `image_urls?.length` (already works)
- Status labels `contacted`, `opkald_mislykkedes` already exist — no sub-statuses for contact method yet

## Plan

### 1. Database Migration
```sql
-- Supplier score columns (replace price_level with granular scores)
ALTER TABLE public.suppliers
  DROP COLUMN IF EXISTS price_level,
  ADD COLUMN IF NOT EXISTS score_floor_sanding integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS score_floor_laying integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS score_surface_treatment integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS score_terrace integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS score_danish_language integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS score_reliability integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS capacity_notes text;

-- Contact-method statuses
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'kontaktet_tlf' AFTER 'contacted';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'kontaktet_mail' AFTER 'kontaktet_tlf';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'kontaktet_sms' AFTER 'kontaktet_mail';
```

### 2. Update Constants
Add labels: `kontaktet_tlf: "Kontaktet - Tlf"`, `kontaktet_mail: "Kontaktet - Mail"`, `kontaktet_sms: "Kontaktet - SMS"` with same color as `contacted`.

### 3. Supplier UI — Slider Scores
Refactor `SupplierList.tsx` dialog:
- Remove `price_level` input
- Replace `quality_score` with 6 Slider components (1-10) for: Gulvslibning, Gulvlægning, Overfladebehandling, Terrasse, Dansk sprog, Pålidelighed
- Add `capacity_notes` textarea
- Show scores as small badges on supplier cards

### 4. AI Auto-fill — `analyze-lead` Update
Add new fields to the tool schema:
- `suggested_sqm` (number | null)
- `suggested_floor_level` (number | null)
- `suggested_has_elevator` (boolean | null)
- Instruct AI to extract these from `lead_message` when possible
- Store in `ai_analysis_flags` JSON

Update prompt to explicitly reference SOP documents: "Henvis specifikt til relevante SOP-dokumenter ved navn (f.eks. 'Ifølge SOP for lakering...')"

Refine `suggested_draft` instructions: "Undgå typiske AI-introsætninger som 'Tak for din henvendelse'. Skriv naturligt og professionelt som en erfaren håndværker."

### 5. "Apply AI Suggestions" Button — LeadAiPanel
After analysis, if `suggested_sqm`, `suggested_floor_level`, or `suggested_has_elevator` are present in `ai_analysis_flags`:
- Show extracted values with an "Anvend AI-forslag" button
- On click, PATCH the lead with these values and show success toast
- Gray out already-filled fields

### 6. "Apply AI Price" Button — LeadAiPanel
After price estimation, show a primary button: **"Anvend AI pris på økonomi"**
- On click: set `revenue = price_max`, `actual_costs = revenue * 0.7`
- Update lead via supabase, show toast: "Økonomi opdateret med 70% dækningsbidrag-estimat"
- Call `onAnalyzed()` to refresh

### 7. LeadAiPanel Props Update
Add `onLeadUpdated` callback (or reuse `onAnalyzed`) to refresh lead data after auto-fill or price application.

---

## Files Modified
- **Migration SQL** — drop `price_level`, add 6 score columns + `capacity_notes`, add 3 status enum values
- `src/lib/constants.ts` — new status labels/colors
- `src/pages/SupplierList.tsx` — slider-based scores, remove price_level
- `supabase/functions/analyze-lead/index.ts` — SOP referencing, auto-fill fields, draft refinement
- `src/components/LeadAiPanel.tsx` — "Anvend AI-forslag" button, "Anvend AI pris" button

