import { leadInput, toLeadPayload } from "../../shared/leads.js";
import { ENV } from "../_core/env.js";
import { publicProcedure, router } from "../_core/trpc.js";

const WEBHOOK_TIMEOUT_MS = 8_000;

/**
 * Forwards a captured lead to the Google Apps Script Web App, which appends the
 * row to the Sheet and sends both notification emails. Returns whether the lead
 * was actually delivered; callers must treat `false` as non-fatal so a webhook
 * outage never blocks a student from starting a test.
 */
async function forwardLead(body: Record<string, unknown>): Promise<boolean> {
  if (!ENV.leadWebhookUrl) {
    console.warn("[leads] LEAD_WEBHOOK_URL is not set — lead was not delivered.");
    return false;
  }

  // Apps Script Web Apps do not expose request headers, so the shared secret is
  // sent in the body (it is also sent as a header for non-Apps-Script receivers).
  const payload = ENV.leadWebhookSecret ? { ...body, secret: ENV.leadWebhookSecret } : body;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(ENV.leadWebhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(ENV.leadWebhookSecret ? { "x-lead-secret": ENV.leadWebhookSecret } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(`[leads] webhook responded with ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[leads] webhook request failed:", error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export const waitlistRouter = router({
  submit: publicProcedure.input(leadInput).mutation(async ({ input }) => {
    // The honeypot field is invisible to humans. When it is filled, pretend to
    // succeed so bots do not learn the trap, but do not forward the lead.
    if (input.company) return { ok: true, delivered: true } as const;

    const delivered = await forwardLead(toLeadPayload(input));
    return { ok: true, delivered } as const;
  }),
});
