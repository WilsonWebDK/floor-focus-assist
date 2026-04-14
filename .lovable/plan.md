

# Automated Priority, Economic Reporting & Image Webhook Upgrade

## What already exists
- `image_urls` (text[]) column already exists on leads
- `receive-lead` webhook already maps `file_upload` and `image_urls` to the `image_urls` column
- `revenue` and `actual_costs` columns exist, with an admin-only Economics section in LeadDetail
- Dashboard already has finance summary for won leads, daily call counter, and inspection widget
- LeadList already sorts by urgency priority (urgent → new <24h → followup today)
- `lead_status` enum: `new`, `needs_qualification`, `contacted`, `inspection_scheduled`, `waiting_for_customer`, `ready_for_pricing`, `offer_sent`, `won`, `lost`

## Plan

### 1. Database Migration
Add two new enum values and one column:
```sql
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'mangler_pris' AFTER 'ready_for_pricing';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'opkald_mislykkedes' AFTER 'contacted';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority_score numeric DEFAULT 0;
```

### 2. Update Constants
- Add `mangler_pris: "Mangler pris"` and `opkald_mislykkedes: "Opkald mislykkedes"` to `LEAD_STATUS_LABELS`
- Add colors: `mangler_pris` → orange, `opkald_mislykkedes` → gray/red

### 3. Priority Score Calculation
In `LeadList.tsx`, compute `priority_score` client-side when sorting:
- `urgency_flag ? 100 : 0`
- `+ (hours_since_created * -0.5)`
- `+ (data_completeness * 10)` — where completeness = count of filled critical fields (image_urls, square_meters, job_type, urgency_flag) out of 4
- Sort by this score descending (replacing the existing manual sort)

### 4. Dashboard: "Urealiseret Potentiale" Widget
- Add a new query: sum `revenue` for leads where status is NOT `won` and NOT `lost` (i.e., active pipeline)
- Display as a new `DashboardWidget` with label "Urealiseret potentiale"
- Rename the revenue field label from "Omsætning" to "Tilbudspris" in the LeadDetail economics section

### 5. Image Gallery in LeadDetail
- After the contact section, if `image_urls` has entries, render a responsive grid (2-3 columns) of clickable thumbnail images
- Clicking opens the image full-size in a new tab
- Show up to 6 images

### 6. LeadList: Revenue Display
- Show `revenue` (Tilbudspris) next to each lead in the list if it has a value, as a small badge/label

### 7. Webhook: Already Done
The `receive-lead` function already accepts `image_urls` as an array and maps `file_upload` — no changes needed.

---

## Files Modified
- **Migration SQL** — add 2 enum values + `priority_score` column
- `src/lib/constants.ts` — new status labels/colors
- `src/pages/LeadList.tsx` — priority score sorting, revenue display
- `src/pages/LeadDetail.tsx` — image gallery, rename "Omsætning" to "Tilbudspris"
- `src/pages/Dashboard.tsx` — "Urealiseret potentiale" widget
- `src/components/StatusBadge.tsx` — no changes needed (already uses constants)

