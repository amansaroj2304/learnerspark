import { z } from "zod";

/**
 * Normalises an Indian mobile number to the canonical `+91XXXXXXXXXX` form.
 *
 * Accepts 10-digit national numbers (optionally prefixed with `+91`, `91`, or
 * a trunk `0`), ignores spaces/dashes/brackets, and returns `""` for anything
 * that is not a valid Indian mobile number (must start with 6-9).
 */
export function normalizeIndianMobile(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  const national =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
  return /^[6-9]\d{9}$/.test(national) ? `+91${national}` : "";
}

/**
 * Lead-capture form input shared by the client (for pre-validation/UX) and the
 * server (authoritative validation). `company` is a hidden honeypot field: real
 * users never fill it, bots usually do.
 */
export const leadInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(20)
    .refine((value) => normalizeIndianMobile(value) !== "", {
      message: "Enter a valid 10-digit Indian mobile number.",
    }),
  company: z.string().max(200).optional(),
});

export type LeadInput = z.infer<typeof leadInput>;

export type LeadPayload = {
  timestamp: string;
  name: string;
  email: string;
  phone: string;
};

/** Maps validated input to the exact row shape stored in the Google Sheet. */
export function toLeadPayload(
  input: Pick<LeadInput, "name" | "email" | "phone">,
  now: Date = new Date()
): LeadPayload {
  return {
    timestamp: now.toISOString(),
    name: input.name,
    email: input.email.trim().toLowerCase(),
    phone: normalizeIndianMobile(input.phone),
  };
}
