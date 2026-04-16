

# Fix: Lead Score Auto-calc, AI Auto-fill, Label Dedup & Dashboard Stats

## Problems

1. **Lead score not auto-calculated on arrival** — `receive-lead` calls `analyze-lead`, which calls `score-lead`. But for leads like "Marie Gade", `job_type` is still null despite `ai_category: slibning`. The `analyze-lead` auto-fill of `job_type` may have failed because the code was deployed after those leads arrived. Need to also ensure `receive-lead` explicitly chains `score-lead` as fallback.

2. **"Haster" and "Hastesag" duplicate in lead header** — Line 468-472 in LeadDetail shows "Haster" badge when `urgency_flag` is true. Line 480-494 shows labels including "Hastesag". When AI applies suggestions, both appear. Fix: Remove the hardcoded "Haster" badge from the header when "Hastesag" is already in labels, OR better: remove the "Haster" text badge entirely since "Hastesag" label already covers it. Keep the `AlertTriangle` icon only.

3. **AI "Anvend AI-forslag" adds labels like "slibning"** — The `applyAiSuggestions` function adds "Hastesag" label correctly but doesn't add the AI category as a label (e.g. "slibning"). The user says "slibning og lakering, haster og kompleks er fine labels". Need to also add AI-extracted category + "Kompleks" if complexity_flag is true.

4. **AI guesses floor level when unknown** — The `suggested_floor_level` is shown even when AI is just guessing. Fix: only show/apply `suggested_floor_level` when the AI returns a non-zero value and the lead message actually mentions it.

5. **Dashboard missing period comparisons** — Need widgets showing leads last 24h, 7d, 30d with comparison to previous period.

6. **Dashboard missing lead score filter** — Need filter buttons for score ranges: 0-3, 4-7, 8-10.

7. **Backfill**: Run `score-lead` and `job_type` update for leads missing these values.

## Plan

### 1. Fix "Haster"/"Hastesag" duplicate (LeadDetail.tsx)
- Remove the standalone "Haster" text badge from the header (lines 468-472)
- The `AlertTriangle` icon is sufficient alongside the "Hastesag" label tag
- Keep the icon-only urgency indicator inline with status badge

### 2. Improve `applyAiSuggestions` (LeadAiPanel.tsx)
- Add AI category as a label (e.g. "Slibning", "Lakering") alongside "Hastesag"
- Add "Kompleks" label if `complexity_flag` is true
- Only apply `suggested_floor_level` if value > 0 (don't guess ground floor)
- Update `LABEL_OPTIONS` and `LABEL_COLORS` to include common AI categories: keep existing + add dynamic support

### 3. Auto-fill on arrival improvements (analyze-lead)
- Already auto-fills `job_type` — verify it works by checking deployment
- Also auto-add labels (Hastesag, Kompleks, category) directly in `analyze-lead` so they appear before user clicks "Anvend AI-forslag"

### 4. Dashboard: Period stats widgets (Dashboard.tsx)
- Add 3 stat cards: "Sidste 24 timer", "Sidste 7 dage", "Sidste 30 dage"
- Each shows count + delta vs previous period (e.g. "+3 vs forrige")
- Calculate from `allLeads` using `created_at` timestamps

### 5. Dashboard: Lead score filter (Dashboard.tsx)
- Add filter buttons above pipeline tabs: "Alle", "0-3", "4-7", "8-10"
- Filter applies to pipeline tab contents
- Uses `calculated_lead_score` or `manual_lead_score`

### 6. Backfill missing data
- SQL update: set `job_type = category` where `job_type IS NULL AND category IS NOT NULL`
- Trigger `score-lead` for recent leads missing scores

## Files Modified
1. **`src/pages/LeadDetail.tsx`** — remove duplicate "Haster" badge
2. **`src/components/LeadAiPanel.tsx`** — improve `applyAiSuggestions` (add category + Kompleks labels, skip floor_level guess)
3. **`supabase/functions/analyze-lead/index.ts`** — auto-set labels on analysis (Hastesag, Kompleks, category)
4. **`src/pages/Dashboard.tsx`** — add period comparison stats + lead score filter
5. **`src/lib/constants.ts`** — add label colors for common categories (slibning, lakering, etc.)
6. **Data backfill** — update `job_type` from `category` for existing leads, trigger score calculation

