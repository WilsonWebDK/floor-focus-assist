

# Step 5: Intelligence Cockpit & Mobile Quick-Log System

## What already exists
- `priority_score` (numeric) column exists on leads — currently set to 0 default, calculated client-side in LeadList
- No `labels` column on leads
- Quick-Lead FAB exists on LeadList (creates new lead with name/phone/address)
- Dashboard has flat widget grid, no tabs
- Reminders page has overdue/today/upcoming/completed tabs
- LeadAiPanel has price estimation with "Anvend AI pris" button but no interactive calculator
- No global FAB or quick-note system

## Plan

### 1. Database Migration
```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS manual_lead_score integer,
  ADD COLUMN IF NOT EXISTS calculated_lead_score integer;
```

### 2. Lead Scoring Edge Function — `score-lead`
New edge function that calculates a 0-10 score:
- sqm weight: 0-30m²=1, 30-80m²=3, 80-150m²=5, 150+=7
- Postal code bonus: Nordsjælland (29xx, 34xx, 28xx) = +2
- Urgency bonus: `urgency_flag = true` = +1
- High-value job types (gulvslibning, terrasse) = +1 from AI category
- Normalize to 0-10 scale
- Updates `calculated_lead_score` on the lead
- Called after `analyze-lead` and on manual trigger

### 3. Lead Score Badge Component
New `LeadScoreBadge` component:
- 0-2: Red, 3-5: Yellow, 6-7: Light green, 8-10: Green
- Displayed in LeadList cards and LeadDetail header
- Manual override slider (1-10) in LeadDetail that writes `manual_lead_score`
- Display logic: show `manual_lead_score` if set, else `calculated_lead_score`

### 4. Multi-Label System
- Fixed label options: `Erhverv`, `Forsikringssag`, `Google Ads lead`, `Hastesag`, `Nordsjælland`, `Privat`
- Multi-select popover in LeadDetail to toggle labels
- Small colored tags on lead cards in LeadList
- Labels stored in `labels text[]` column

### 5. Global Mobile Quick-Note FAB
- New `QuickNoteButton` component rendered in `AppLayout` (visible on mobile only)
- Opens a Drawer with:
  - Note textarea
  - If on `/leads/:id` route, auto-attach to that lead
  - Otherwise: search/select existing lead OR "Opret nyt lead fra note"
- Saves to `communication_logs` table as type `note`

### 6. Dashboard Tabs
- Wrap lead widgets in a `Tabs` component with: Nye, Kontaktet, Tilbud sendt, Venter, Vundet
- Each tab filters leads by that status group and shows a simple list
- Keep finance summary and priority feed outside tabs

### 7. Reminders Split View
- Split reminders into two sections: "Automatiske" (system-generated, `created_by IS NULL`) and "Mine" (manual, `created_by = user.id`)
- Add sort toggle: by due date or by lead score (join leads table)

### 8. Interactive Price Calculator
- In LeadAiPanel, add an expandable form section: m², wood type, treatment type, difficulty multiplier (1.0-2.0)
- Local state only — real-time calculation: `base_price_per_sqm * sqm * difficulty`
- Base prices: Slibning=150kr/m², Lægning=250kr/m², Lakering=100kr/m²
- "Gem i lead-data" button that patches lead with calculated values
- Separate from AI price estimation

## Files Modified
- **Migration SQL** — add `labels`, `manual_lead_score`, `calculated_lead_score` columns
- `supabase/functions/score-lead/index.ts` — new scoring edge function
- `src/components/LeadScoreBadge.tsx` — new score badge component
- `src/components/QuickNoteButton.tsx` — new global FAB for quick notes
- `src/components/AppLayout.tsx` — add QuickNoteButton
- `src/pages/LeadList.tsx` — show score badge + label tags on cards
- `src/pages/LeadDetail.tsx` — score badge, manual override, label selector
- `src/pages/Dashboard.tsx` — add Tabs for status filtering
- `src/pages/Reminders.tsx` — split into auto/manual sections
- `src/components/LeadAiPanel.tsx` — interactive price calculator section
- `src/lib/constants.ts` — label options + score colors

