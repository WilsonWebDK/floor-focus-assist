

# Phase 3: Supplier CRUD, Reminder Engine, Webhook Control Panel

## 1. Database Migration

**New tables:**

```sql
-- Webhook settings
CREATE TABLE public.webhook_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,         -- 'lead_created', 'lead_won', 'status_changed'
  webhook_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: authenticated full access

-- Webhook logs
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_setting_id UUID REFERENCES public.webhook_settings(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: authenticated select access
```

No schema changes needed for suppliers or reminders -- existing tables are sufficient.

---

## 2. Supplier Management -- Full CRUD

**File: `src/pages/SupplierList.tsx`** (rewrite)

- Add "Tilføj leverandør" button opening a create dialog/form
- Each supplier card gets Edit and Delete action buttons
- Edit opens an inline form or dialog with all supplier fields (name, phone, email, skills, cities_served, quality_score, price_level, can_do_carpentry, speaks_good_danish, notes)
- Delete with confirmation
- Keep the existing card layout but add action buttons

---

## 3. AI Supplier Match on LeadDetail

**New edge function: `match-supplier`**
- Receives `lead_id`
- Fetches lead (city, floor_type, job_type, square_meters)
- Fetches all suppliers
- Sends to Gemini 2.5 Flash with tool calling to return top 3 matches with reasoning
- Returns structured result: `[{ supplier_id, name, score, reason }]`

**LeadDetail UI addition:**
- New "Find bedste leverandør" button in the AI panel or as a separate section
- Shows top match with supplier name, score, reasoning, and a one-click "Tildel" button
- "Tildel" sets `lead.assigned_to` (note: assigned_to is UUID, but suppliers use their own IDs -- we'll store supplier name in a new display or use the supplier ID differently)
- Actually, `assigned_to` is a UUID meant for users. Better approach: add a "matched_supplier" display that links to the supplier. We can store the match result in the lead's `ai_analysis_flags` or show it ephemerally.

Decision: Show match results ephemerally (not persisted) since supplier matching is an advisory action. The user clicks "Tildel" which could update `internal_notes` with the supplier assignment, or we keep it simple and just display the result.

---

## 4. Automated Reminder Engine

**Approach:** A scheduled edge function `auto-reminders` that runs periodically (via pg_cron) and:
1. Finds leads where `status = 'new'` AND `created_at < now() - interval '24 hours'`
2. Checks if a reminder already exists for that lead (avoid duplicates)
3. Creates a reminder: "Opfølgning på nyt lead: {name}" with `due_at = now()`

**Reminders.tsx enhancements:**
- Replace the binary "Aktive/Fuldførte" filter with three tabs: "Forfaldne" (overdue), "I dag" (today), "Kommende" (upcoming)
- Add visual urgency: red pulse/dot for overdue, yellow for today
- Link each reminder to its related lead (clickable)

---

## 5. Webhook Control Panel in Settings

**Settings.tsx** -- Add a "Webhooks" section (or tab) with two sub-sections:

**Incoming Webhooks:**
- Display the REST API URL for the leads table: `https://{project_ref}.supabase.co/rest/v1/leads`
- Show the anon key (already public) and example curl/Make.com HTTP module config
- Read-only instructional panel

**Outgoing Webhooks:**
- CRUD interface for `webhook_settings` table
- Form: event type dropdown (Lead oprettet, Lead vundet, Status ændret) + webhook URL input + active toggle
- List existing webhook settings with edit/delete
- Show recent webhook logs from `webhook_logs` (last 20)

**New edge function: `fire-webhook`**
- Called from frontend when lead status changes (or can be triggered via database webhook later)
- Fetches active webhook_settings matching the event_type
- POSTs lead data to each URL
- Logs result in webhook_logs

**Integration points:**
- In LeadDetail `updateStatus()`, after status change, call `fire-webhook` edge function with event_type and lead data
- In LeadCreate, after creation, call `fire-webhook` with `lead_created`

---

## 6. Implementation Order

1. Database migration (webhook_settings, webhook_logs tables)
2. Supplier CRUD (SupplierList.tsx rewrite with create/edit/delete)
3. `match-supplier` edge function + LeadDetail button
4. Reminders.tsx enhanced filters + urgency indicators
5. `auto-reminders` edge function + pg_cron schedule
6. Webhook Control Panel UI in Settings
7. `fire-webhook` edge function + wire into LeadDetail/LeadCreate

---

## Technical Notes

- All AI calls use `google/gemini-2.5-flash` via the Lovable AI Gateway
- Supplier match results shown ephemerally -- no new DB columns needed
- The `fire-webhook` function uses service role to read webhook_settings but validates the calling user's JWT
- pg_cron for auto-reminders uses the project's anon key and REST URL (inserted via the insert tool, not migrations)
- Webhook logs provide transparency for Make.com debugging

