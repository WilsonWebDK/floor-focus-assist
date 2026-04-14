export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Ny",
  needs_qualification: "Mangler kvalificering",
  contacted: "Kontaktet",
  kontaktet_tlf: "Kontaktet - Tlf",
  kontaktet_mail: "Kontaktet - Mail",
  kontaktet_sms: "Kontaktet - SMS",
  opkald_mislykkedes: "Opkald mislykkedes",
  inspection_scheduled: "Inspektion booket",
  waiting_for_customer: "Venter på kunde",
  ready_for_pricing: "Klar til pris",
  mangler_pris: "Mangler pris",
  offer_sent: "Tilbud sendt",
  won: "Vundet",
  lost: "Tabt",
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "bg-status-new/10 text-status-new",
  needs_qualification: "bg-status-warning/10 text-status-warning",
  contacted: "bg-primary/10 text-primary",
  kontaktet_tlf: "bg-primary/10 text-primary",
  kontaktet_mail: "bg-primary/10 text-primary",
  kontaktet_sms: "bg-primary/10 text-primary",
  opkald_mislykkedes: "bg-destructive/10 text-destructive",
  inspection_scheduled: "bg-status-success/10 text-status-success",
  waiting_for_customer: "bg-status-neutral/10 text-status-neutral",
  ready_for_pricing: "bg-status-success/10 text-status-success",
  mangler_pris: "bg-status-warning/10 text-status-warning",
  offer_sent: "bg-status-urgent/10 text-status-urgent",
  won: "bg-status-success/10 text-status-success",
  lost: "bg-destructive/10 text-destructive",
};

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  website_form: "Hjemmeside",
  quiz_funnel: "Quiz",
  manual: "Manuel",
  referral: "Anbefaling",
  phone: "Telefon",
  email: "Email",
  other: "Andet",
};

export const COMM_TYPE_LABELS: Record<string, string> = {
  phone_call: "Telefonopkald",
  email: "Email",
  sms: "SMS",
  meeting: "Møde",
  note: "Note",
  other: "Andet",
};

export const COMM_DIRECTION_LABELS: Record<string, string> = {
  inbound: "Indgående",
  outbound: "Udgående",
  internal: "Intern",
};

export const PARKING_STATUS_LABELS: Record<string, string> = {
  free: "Gratis",
  paid: "Betalt",
  permit_required: "Tilladelse påkrævet",
  unknown: "Ukendt",
};

export const NEXT_ACTION_LABELS: Record<string, string> = {
  call_again: "Ring igen",
  send_quote: "Send tilbud",
  schedule_inspection: "Book inspektion",
  follow_up: "Opfølgning",
};
