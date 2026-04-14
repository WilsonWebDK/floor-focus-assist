

# Step 1: Technical Foundation & Missing Info Engine

## What already exists
The `leads` table already has: `square_meters`, `floor_level`, `has_elevator`, `parking_status` (enum), `doorsteps_count`, `stairs_count`, `floor_separation_type`, `urgency_flag`, `job_type`, `floor_type`, `treatment_preference`. Several requested columns overlap with existing ones.

## Plan

### 1. Database Migration
Add only the truly new columns to `leads`:
- `power_13a_available` (boolean, default false)
- `floor_history` (text) — previous treatments/history of the floor
- `desired_look` (text) — customer's desired outcome
- `urgency_status` (text) — freeform urgency description (supplements existing boolean `urgency_flag`)
- `quality_expectation` (text) — customer's quality expectations
- `time_requirement` (text) — timeline/scheduling constraints
- `image_urls` (text[]) — array of image URLs from uploads or Elementor
- `quiz_slug` (text, unique) — secure slug for quiz submissions
- `missing_info_score` (integer, default 0) — computed in app logic (not generated column, to keep it simple)

Skip columns that already exist: `square_meters`, `floor_level`, `has_elevator`, `parking_status`, `doorsteps_count`.

### 2. Missing Info UI — LeadList badges
Update `LeadList.tsx` to show small colored badges next to each lead indicating missing critical info:
- No images → "Mangler billede" badge (red)
- No `square_meters` → "Mangler m²" badge
- No `job_type` → "Mangler opgavetype" badge
- No `urgency_flag` set → "Mangler hast" badge

Badges shown as small inline pills after the lead name.

### 3. Missing Info Checklist — LeadDetail sidebar
Add an "Informationsstatus" card in `LeadDetail.tsx` (above or below the Details section) with a visual checklist:
- Billeder ✓/✗
- Kvadratmeter ✓/✗
- Opgavetype ✓/✗
- Gulvtype ✓/✗
- Hastegrad ✓/✗
- Behandlingsønske ✓/✗

Each item shows green check or red X. A progress bar at top shows completion percentage.

### 4. Quick-Lead Mobile Button
Add a floating action button (FAB) on `LeadList.tsx` that opens a minimal dialog with only: Name, Phone, Address. On submit, creates a lead with `source: 'phone'` and navigates to it. Optimized for mobile use during phone calls.

### 5. LeadCreate & LeadDetail — New Fields
- Update `LeadCreate.tsx` to include inputs for the new columns (power_13a, floor_history, desired_look, quality_expectation, time_requirement)
- Update `EditForm` and `DetailView` in `LeadDetail.tsx` to display/edit these fields
- Update `saveEdits` to persist the new fields

### 6. PDF Quote Placeholder
Add a "PDF Tilbud" button in `LeadDetail.tsx` (near the AI panel) with a tooltip: "Kommer snart — Google Slides integration". Button is disabled.

### 7. Webhook Mapping Upgrade
Update the existing webhook/lead creation endpoint to map incoming `m2` → `square_meters` and `file_upload` → `image_urls` fields from Elementor/Make.com payloads.

### 8. Email Trigger (Quiz Link)
- Generate `quiz_slug` (nanoid) automatically when a lead is created via Elementor webhook
- Use the existing Lovable email infrastructure to send a transactional email containing a dynamic quiz link: `https://profgulve.lovable.app/?id=[quiz_slug]`
- This fires from the webhook handler after lead creation

---

## Technical details

### Files modified
- **New migration SQL** — adds 8 columns to `leads`
- `src/pages/LeadList.tsx` — missing info badges + Quick-Lead FAB
- `src/pages/LeadDetail.tsx` — info checklist card, new field display/edit, PDF placeholder button
- `src/pages/LeadCreate.tsx` — new field inputs
- `src/lib/constants.ts` — no changes needed
- Webhook edge function — field mapping update
- Transactional email template — quiz link email (if email infra is ready)

### Migration SQL (approximate)
```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS power_13a_available boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS floor_history text,
  ADD COLUMN IF NOT EXISTS desired_look text,
  ADD COLUMN IF NOT EXISTS urgency_status text,
  ADD COLUMN IF NOT EXISTS quality_expectation text,
  ADD COLUMN IF NOT EXISTS time_requirement text,
  ADD COLUMN IF NOT EXISTS image_urls text[],
  ADD COLUMN IF NOT EXISTS quiz_slug text UNIQUE;
```

