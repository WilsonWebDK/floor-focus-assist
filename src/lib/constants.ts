export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Ny",
  needs_qualification: "Mangler kvalificering",
  contacted: "Kontaktet",
  waiting_for_customer: "Venter på kunde",
  ready_for_pricing: "Klar til pris",
  offer_sent: "Tilbud sendt",
  won: "Vundet",
  lost: "Tabt",
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "bg-status-new/10 text-status-new",
  needs_qualification: "bg-status-warning/10 text-status-warning",
  contacted: "bg-primary/10 text-primary",
  waiting_for_customer: "bg-status-neutral/10 text-status-neutral",
  ready_for_pricing: "bg-status-success/10 text-status-success",
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
