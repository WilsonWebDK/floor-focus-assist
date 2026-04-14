

# Step 2: High-Speed Sales Engine & Mobile Call Logic

## Current State
- Pipeline enum already has: `new`, `needs_qualification`, `contacted`, `waiting_for_customer`, `ready_for_pricing`, `offer_sent`, `won`, `lost`
- The request asks for `inspection_scheduled` and `quote_sent` — `offer_sent` already covers `quote_sent`. We need to add `inspection_scheduled` to the enum.
- `last_contacted_at` and `next_followup_at` already exist on leads. No need for `next_action_date`.
- Communication logs already exist — we can add a `next_action_type` to leads instead of a separate interactions table, keeping things simple.
- One-click call logging already works via `logCall()` in LeadDetail.

## Plan

### 1. Database Migration
- Add `inspection_scheduled` to `lead_status` enum (between `contacted` and `waiting_for_customer`)
- Add `next_action_type` (text) column to `leads` — values like "call_again", "send_quote", "schedule_inspection"

### 2. Update Constants
- Add `inspection_scheduled: "Inspektion booket"` to `LEAD_STATUS_LABELS` and `LEAD_STATUS_COLORS`
- Add `NEXT_ACTION_LABELS` map: `call_again → "Ring igen"`, `send_quote → "Send tilbud"`, `schedule_inspection → "Book inspektion"`, `follow_up → "Opfølgning"`

### 3. Mobile Call View (MobileCallView)
Create `src/components/MobileCallView.tsx` — a Drawer (vaul) that opens when tapping a lead on mobile:
- **Click-to-Call** button (`tel:` link) — large, prominent
- **Missing Info Checklist** embedded (inline-editable: sqm, floor_level, parking_status)
- **Call Notes** textarea
- **Forced Next Action**: must select `next_action_type` + `next_action_date` before closing
- On save: creates comm_log, updates `last_contacted_at`, `next_followup_at`, `next_action_type`, auto-sets status to `contacted` if currently `new`

Trigger: In `LeadDetail.tsx`, detect mobile via `useIsMobile()` and show a "Ring kunde" button that opens the drawer.

### 4. Forced Next-Action Logic
- The MobileCallView save button is disabled until both `next_action_type` and a date are selected
- After first interaction is logged, automatically update status from `new` → `contacted`
- Also apply this auto-status-change in the existing `logCall()` function

### 5. LeadList Urgency Sorting & Indicators
Update `LeadList.tsx`:
- Sort leads: urgent first, then new leads < 24h, then leads with `next_followup_at` <= today, then rest by `created_at` desc
- Add **12h urgency indicator**: leads in `new` status for >12h without any comm_log get a glowing red left-border and a "Ikke kontaktet" label
- This requires fetching `communication_logs` count per lead or using `last_contacted_at` (simpler — if null and age > 12h)

### 6. Dashboard: Daily Call Counter
Add a new `DashboardWidget` showing "Opkald i dag" — count of `communication_logs` where `type = 'phone_call'` and `created_at >= today`.

### 7. Dashboard: Inspection Scheduled Count
Add widget for leads with `status = 'inspection_scheduled'` count.

---

## Files Modified
- **Migration SQL**: add `inspection_scheduled` to enum, add `next_action_type` to leads
- `src/lib/constants.ts` — new status + action labels
- `src/components/MobileCallView.tsx` — new component (Drawer)
- `src/pages/LeadDetail.tsx` — integrate MobileCallView, auto-status on logCall
- `src/pages/LeadList.tsx` — urgency sorting, 12h indicator
- `src/pages/Dashboard.tsx` — daily call counter widget

## Migration SQL
```sql
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'inspection_scheduled' AFTER 'contacted';

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS next_action_type text;
```

