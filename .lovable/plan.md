

# Phase 1: Branding Update, Calendar Prep, and Communication UI

This plan covers three areas: rebranding to the new color scheme, preparing Google Calendar integration, and building a chat-style communication history UI.

---

## 1. Rebrand to New Color Palette

Update `src/index.css` CSS variables and `tailwind.config.ts` to reflect the new brand:

- **Background**: `#FFFFFF` (pure white)
- **Primary/CTA**: `#0091FF` (bright blue) -- all buttons, active states, badges, ring
- **Accent**: `#BBE9FE` (light blue) -- hover states, soft backgrounds, card highlights, secondary accents
- **Sidebar**: Updated to match the blue palette instead of forest green

Affected files: `src/index.css`, `tailwind.config.ts`

No structural changes -- just HSL value swaps in CSS custom properties.

---

## 2. Database Migration: Calendar Fields on Leads

Add two columns to the `leads` table:

```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_link TEXT;
```

These will store the Google Calendar event ID and a direct link to the event for each lead with a follow-up date.

---

## 3. Google Calendar Integration (Edge Function + OAuth)

This is the most complex part. The approach:

**a) OAuth Flow**
- Create an edge function `google-calendar-auth` that handles:
  - Generating the Google OAuth consent URL (redirect user to Google)
  - Handling the callback with authorization code
  - Exchanging code for access/refresh tokens
  - Storing tokens securely (new `user_google_tokens` table with RLS)

**b) Calendar Sync Edge Function**
- Create `google-calendar-sync` edge function that:
  - Receives lead_id and follow-up date
  - Uses stored Google tokens to create/update/delete calendar events
  - Stores the `google_calendar_event_id` back on the lead
  - Returns the calendar event link

**c) Required Secrets**
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` -- will need to be added via the secrets tool. The user will need to create a Google Cloud project with Calendar API enabled.

**d) New Database Table**
```sql
CREATE TABLE public.user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: users can only read/write their own tokens
```

**e) Frontend Changes**
- Add a "Forbind Google Kalender" button in the app (settings or lead detail)
- Add a "Synkroniser til kalender" toggle on LeadDetail when `next_followup_at` is set
- Show calendar link when synced

---

## 4. Enhanced Lead Detail Page

Updates to `src/pages/LeadDetail.tsx`:
- Apply new branding (blue accents on cards, borders)
- Add "Kalender" section showing sync status and toggle
- Add follow-up date picker (for `next_followup_at`)
- When follow-up date changes and calendar sync is on, call the edge function

---

## 5. Communication History (Chat-Style UI Prep)

Updates to `src/pages/LeadDetail.tsx`:
- Replace the current linear communication log with a chat-bubble style layout
- Inbound messages on the left, outbound on the right, internal notes centered
- Add a placeholder "Gmail" tab that shows "Gmail-integration kommer snart" 
- Create a `CommunicationTimeline` component for reuse

---

## 6. Dashboard Enhancements

Updates to `src/pages/Dashboard.tsx`:
- Apply new branding colors
- "Opfølgning i dag" widget items link to the lead detail page (already done)
- Add calendar icon indicator on leads that are synced to Google Calendar
- Ensure webhook-created leads (source != 'manual') sort to top of "Nye leads"

---

## Implementation Order

1. Branding update (CSS only, immediate visual impact)
2. Database migration (calendar fields + token table)
3. Communication timeline component
4. LeadDetail UI enhancements (calendar section, chat UI, follow-up picker)
5. Dashboard polish
6. Google Calendar edge functions (auth + sync)
7. Wire up calendar toggle to edge function

---

## Technical Notes

- Google OAuth requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` secrets. These will be requested from the user before building the edge functions.
- The calendar sync is triggered manually via a toggle, not automatically, to keep the user in control.
- The `user_google_tokens` table uses strict RLS so each user can only access their own tokens.
- Edge functions use CORS headers and JWT validation per project standards.

