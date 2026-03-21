

# Phase 4: Architectural Fixes & Automation

## Overview
Five targeted fixes: scalable dashboard queries, lead-to-customer lifecycle, deterministic pricing, automated supplier outreach, and one-click call logging.

---

## 1. Dashboard Server-Side Filtering (`src/pages/Dashboard.tsx`)

Replace the single `leads` query with `.limit(50)` with three targeted queries:

```text
Query 1: leads WHERE status = 'new' ORDER BY created_at DESC
Query 2: leads WHERE urgency_flag = true AND status NOT IN ('won','lost') ORDER BY created_at DESC
Query 3: leads WHERE next_followup_at >= today_start AND next_followup_at < tomorrow_start
```

Remove client-side filtering for `newLeads`, `urgentLeads`, and `followUpsToday`. Keep reminders query as-is. Update `PriorityFeed` to receive the union of these three sets (deduplicated) instead of a monolithic leads array.

---

## 2. Lead → Customer Lifecycle

**Database migration:**
- Add `customer_id UUID REFERENCES customers(id)` to `leads` table
- Create a DB function + trigger: when `leads.status` changes to `'won'`, upsert into `customers` (match on email or phone), then set `leads.customer_id` to the customer ID

**LeadDetail.tsx:**
- After `updateStatus('won')`, show a toast linking to the customer record
- Display `customer_id` link in DetailView if set

---

## 3. Deterministic Pricing (`estimate-price/index.ts`)

Move math out of the AI prompt. In the edge function TypeScript:

```text
1. Fetch knowledge_documents for base pricing rules (existing RAG)
2. Calculate deterministically:
   - base_price = rate_per_sqm * square_meters
   - stair_surcharge = stairs_count * STAIR_RATE
   - doorstep_surcharge = doorsteps_count * DOORSTEP_RATE
   - parking_surcharge (if parking_info indicates difficulty)
   - elevator_surcharge (if no elevator in multi-story)
3. Send the CALCULATED price + lead context to AI ONLY for:
   - Formatting the explanation text
   - Flagging missing info
   - Confidence assessment
4. price_min/price_max derived from deterministic calc ± margin
```

Update `generate-quote/index.ts`: append any `disclaimer` field from the active `sales_templates` record verbatim after the AI-refined quote text (never passed through AI).

**Database migration:** Add `disclaimer TEXT` column to `sales_templates`. Update `SalesTemplates.tsx` to include a disclaimer textarea.

---

## 4. Automated Supplier Outreach (`LeadAiPanel.tsx`)

Replace `requestAvailability()` which inserts a reminder with a call to:

```text
supabase.functions.invoke("fire-webhook", {
  body: {
    event_type: "supplier_availability_request",
    payload: { supplier_name, supplier_phone, supplier_email, lead summary }
  }
})
```

Add `"supplier_availability_request"` to the `EVENT_TYPES` map in `WebhookPanel.tsx` so users can configure a Make.com webhook URL for this event.

This allows Make.com to send an automated SMS/email to the supplier.

---

## 5. One-Click Call Logging (`LeadDetail.tsx`)

Add a prominent "Log opkald" button next to the phone number in the quick contact section. On click:

1. Instantly insert a `communication_logs` record: `type: 'phone_call'`, `direction: 'outbound'`, `summary: 'Udgående opkald'`, `lead_id`, `created_by`
2. Update `leads.last_contacted_at` to now
3. Open an inline Popover (using existing `@/components/ui/popover`) anchored to the button with:
   - A small textarea for an optional note (updates the comm log summary)
   - A date input for `next_followup_at`
   - A "Gem" button to save the note + followup
4. Toast confirmation immediately on click (before popover interaction)

---

## Implementation Order

1. Database migration: `customer_id` on leads, trigger for won→customer upsert, `disclaimer` on sales_templates
2. Dashboard.tsx: three server-side queries, remove `.limit(50)` filtering
3. PriorityFeed.tsx: accept pre-filtered leads
4. estimate-price edge function: deterministic math + AI formatting only
5. generate-quote edge function: append disclaimer verbatim
6. SalesTemplates.tsx: add disclaimer field
7. LeadAiPanel.tsx: replace reminder insert with webhook fire
8. WebhookPanel.tsx: add supplier_availability_request event type
9. LeadDetail.tsx: one-click call log with popover
10. LeadDetail.tsx: show customer link when won

