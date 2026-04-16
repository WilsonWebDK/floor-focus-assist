

# Fix: Auto Lead Score, AI Auto-fill on Arrival, Apply Suggestions & Price Note

## Problems identified

1. **Lead score not calculated automatically** — `score-lead` is only called manually or after clicking AI analyse. It should run automatically when a lead arrives (in `receive-lead`) and after `analyze-lead`.
2. **"Opgave" and "Hast" shown as red missing badges** — `MissingInfoBadges` marks `job_type` and `urgency_flag` as missing with red labels. AI should auto-populate these on arrival. The `analyze-lead` function already sets `urgency_flag` and `category` but NOT `job_type`. Fix: also write `job_type` from AI category.
3. **"Anvend AI-forslag" doesn't apply AI-extracted labels/category** — Currently `applyAiSuggestions` only applies `suggested_sqm`, `suggested_floor_level`, `suggested_has_elevator`. It ignores `category` (which should map to `job_type`) and doesn't add labels. Fix: also write `job_type` from category and add relevant labels (e.g. "Hastesag" if urgency_flag).
4. **Lead score not shown in Dashboard** — Already shows in LeadList but needs to also appear in Dashboard lead widgets.
5. **Price calculator missing note field for extra AI context** — User wants a small textarea to provide additional info to AI price recalculation, plus a button to apply the new price to lead economics.

## Plan

### 1. Auto-trigger score-lead after analyze-lead (backend)
- **`analyze-lead/index.ts`**: After updating the lead, call `score-lead` automatically (fire-and-forget).
- **`receive-lead/index.ts`**: After `analyze-lead` call, also chain `score-lead` (analyze-lead will do it, so no extra call needed here).

### 2. Auto-populate job_type from AI category
- **`analyze-lead/index.ts`**: In `updateData`, add `job_type: analysis.category` when the lead's current `job_type` is null.
- This makes "Opgave" badge disappear after AI runs.

### 3. Fix "Anvend AI-forslag" to also apply job_type and labels
- **`LeadAiPanel.tsx` → `applyAiSuggestions`**: 
  - Also set `job_type` from `aiAnalysisFlags.category` if lead has no job_type
  - Also set `labels` — add "Hastesag" if `urgencyFlag`, add category as a tag if relevant
  - Show what was applied in the success toast

### 4. Add extra-info note field for AI price recalculation
- **`LeadAiPanel.tsx`**: Add a small `<Textarea>` next to "Beregn tilbudspris" button for extra context
- Pass `extra_context` to `estimate-price` edge function
- **`estimate-price/index.ts`**: Accept `extra_context` parameter and include it in the AI prompt
- Add "Tilføj til økonomi" button on the recalculated price (already exists as "Anvend AI pris på økonomi")

### 5. MissingInfoBadges: adjust "Hast" logic
- **`LeadList.tsx` → `MissingInfoBadges`**: Change `urgency_flag` check — if AI has analyzed the lead and set `urgency_flag = false`, that's valid data (not missing). Only show "Hast" as missing if AI hasn't analyzed yet (`ai_analysis_flags` is null).

## Files Modified

1. **`supabase/functions/analyze-lead/index.ts`** — auto-set `job_type` from category, auto-call `score-lead`
2. **`supabase/functions/estimate-price/index.ts`** — accept `extra_context` param
3. **`src/components/LeadAiPanel.tsx`** — fix `applyAiSuggestions` to include job_type/labels, add extra-info textarea for price
4. **`src/pages/LeadList.tsx`** — fix `MissingInfoBadges` "Hast" logic

