import { api } from "./student";

// Capture a lightweight lead (name, email, phone) before a practice test so the
// student can be contacted about the test series. Set to `false` to disable the
// prompt entirely. The form is shown every time a test is started; students can
// skip it and the test still runs.
export const isLeadFormEnabled = true;

export type LeadFormData = { name: string; email: string; phone: string };

/**
 * Sends the lead to the server, which forwards it to Google Sheets + Gmail via
 * the Apps Script webhook. Never throws on delivery failure — returns whether
 * the lead reached the webhook so the UI can continue regardless.
 */
export async function submitLead(data: LeadFormData): Promise<boolean> {
  const result = await api.waitlist.submit.mutate({ ...data, company: "" });
  return Boolean(result?.delivered);
}
