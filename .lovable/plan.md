

# Fix: 5 Bugs — Overflow, Score, Labels, Quick-Note & Reminders

## 1. Horizontal overflow on mobile (Dashboard pipeline tabs)
- **Dashboard.tsx**: Make `TabsList` horizontally scrollable with `overflow-x-auto` and `flex-nowrap`, prevent it from forcing page-wide scroll
- **LeadList.tsx filter pills**: Already uses `flex-wrap` — verify no overflow from label badges on cards by adding `overflow-hidden` to the card container
- **AppLayout.tsx desktop nav**: Already `hidden md:flex` — no issue on mobile

## 2. Lead score not showing / slider not working
- **Root cause**: Both `manual_lead_score` and `calculated_lead_score` are null for all leads, so `LeadScoreBadge` returns null. The `score-lead` edge function is never called automatically.
- **Fix A**: Show a default "–" badge when score is null instead of hiding it entirely
- **Fix B**: The Slider uses `onValueCommit` which only fires on pointer-up — change to also use `onValueChange` for live visual feedback, and keep `onValueCommit` for saving
- **Fix C**: Call `score-lead` automatically after `analyze-lead` completes in `LeadAiPanel`, so calculated scores populate
- **Fix D**: Add a "Beregn score" button in LeadDetail as a manual trigger

## 3. Merge Status and Labels — keep Status, drop Labels
- **Remove** the `labels` column usage entirely (keep DB column, just stop using it in UI)
- **Add** "Erhverv", "Hastesag", "Privat" as new values in the `lead_status` enum via migration
- **Update** `LEAD_STATUS_LABELS` and `LEAD_STATUS_COLORS` in constants.ts
- **Remove** `LABEL_OPTIONS`, `LABEL_COLORS` exports
- **Remove** label display from LeadList cards, LeadDetail header, and the Labels section in LeadDetail
- **Allow multi-select on status**: No — status is a single enum. Instead, re-purpose labels as "tags" that are part of the status pipeline buttons. Actually, the user said "der skal kunne vælges flere" — so we keep the `labels` array but rename it conceptually as extra status tags. We merge the UI: show status + tags together in one section, remove the separate Labels section. Add "Erhverv", "Hastesag", "Privat" to the tag options (they're already there in LABEL_OPTIONS). Remove "Forsikringssag", "Google Ads lead", "Nordsjælland" — wait, the user said "Tilføj Erhverv, Hastesag, Privat til Status" and "skrot Labels". Let me re-read: "Status og labels skal slås sammen… Behold Status - skrot Labels. Tilføj Erhverv, Hastesag, Privat til Status."

So: Keep single status dropdown. But allow *additional* multi-select tags (Erhverv, Hastesag, Privat) shown alongside the status. Merge the UI into one section. Remove the separate "Labels" card. The tags come from the existing `labels` column. Simplify LABEL_OPTIONS to just `["Erhverv", "Hastesag", "Privat"]`.

**Implementation:**
- Merge Labels into the Status section in LeadDetail — show tag toggles below status buttons
- Update `LABEL_OPTIONS` to `["Erhverv", "Hastesag", "Privat"]`
- Remove separate Labels card from LeadDetail
- Show tags alongside StatusBadge in LeadList cards
- Remove label display from Dashboard (keep it clean)

## 4. Quick-Note + Quick-Lead FABs — merge into one
- **Current**: `QuickNoteButton` (FAB in AppLayout, bottom-right) + Quick-Lead FAB in LeadList (also bottom-right)
- **Fix**: Merge into one FAB in AppLayout that opens a drawer with tabs: "Note" and "Nyt lead"
- Remove the Quick-Lead FAB from LeadList.tsx
- The merged drawer should be compact: reduce padding, use smaller text, fewer rows in textarea
- Position: single FAB at bottom-right, smaller (`h-11 w-11`)

## 5. Follow-up reminders not appearing in Reminders page
- **Root cause**: `updateFollowup` in LeadDetail only updates `leads.next_followup_at` — it does NOT create a row in the `reminders` table
- **Fix**: When a follow-up date is set, also insert/upsert a reminder in the `reminders` table with `related_type: 'lead'`, `related_id: lead.id`, `title: "Opfølgning: {lead.name}"`, `due_at: date`
- When follow-up date is cleared, delete/complete the corresponding reminder
- This ensures reminders show up on both the Reminders page and Dashboard

## Technical Details

### Files Modified
1. **`src/pages/Dashboard.tsx`** — scrollable TabsList, remove label display
2. **`src/components/LeadScoreBadge.tsx`** — show "–" when null
3. **`src/pages/LeadDetail.tsx`** — fix slider (add onValueChange), merge labels into status section, create reminders on followup, remove separate labels card
4. **`src/pages/LeadList.tsx`** — remove Quick-Lead FAB, simplify label display
5. **`src/components/QuickNoteButton.tsx`** — add "Nyt lead" tab, make drawer more compact
6. **`src/lib/constants.ts`** — simplify LABEL_OPTIONS to 3 items, remove unused colors
7. **`src/components/AppLayout.tsx`** — no changes needed (QuickNoteButton already here)

### Migration
```sql
-- No schema migration needed. We reuse existing labels column and status enum.
```

