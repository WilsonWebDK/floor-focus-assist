

# Step 3.5: AI Email Drafts & SOP Document Viewer

## Current State
- `analyze-lead` already returns structured analysis via tool calling but no email draft
- `KnowledgeBase.tsx` already has a "View" button with signed URLs (added in Step 3)
- `LeadAiPanel.tsx` has the rundown, price, quote, and supplier sections
- `embed-document` is already triggered on upload
- Revenue field ("Tilbudspris") is already visible and editable in LeadDetail (admin-only Economics section)
- New statuses `mangler_pris` and `opkald_mislykkedes` are already in the enum and constants

## Plan

### 1. Update `analyze-lead` Edge Function
- Add `suggested_draft` to the tool schema — a personalized email response in Danish addressing the customer by name, referencing their floor type, sqm, and any technical concerns
- Add instruction in the prompt to generate a professional email draft
- Store `suggested_draft` in the `ai_analysis_flags` JSON (no migration needed)

### 2. Update LeadAiPanel.tsx — "Udkast til svar" Section
- Add `suggested_draft` to the `AiAnalysisFlags` interface
- After the suggested questions section, add a new "Udkast til svar" card:
  - Display the draft text in a readable format
  - "Kopiér til udklipsholder" button with toast confirmation
  - Small info badge: "Gmail integration afventer — kopiér/indsæt manuelt"

### 3. KnowledgeBase.tsx — Already Done
The View button with signed URLs was already implemented in Step 3. The embed-document process is already triggered on upload. No changes needed.

### 4. UI Polish — Already Done
- "Tilbudspris" is already labeled and editable in LeadDetail economics section
- `mangler_pris` and `opkald_mislykkedes` are already in `LEAD_STATUS_LABELS` and rendered in the status pipeline buttons

## Files Modified
- `supabase/functions/analyze-lead/index.ts` — add `suggested_draft` to tool schema and prompt
- `src/components/LeadAiPanel.tsx` — add email draft section with copy button

## No Database Migration Needed

