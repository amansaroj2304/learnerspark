import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { leadInput, normalizeIndianMobile, toLeadPayload } from "../../shared/leads";
import { ENV } from "../_core/env";
import { waitlistRouter } from "./waitlist";

const caller = waitlistRouter.createCaller({} as never);

describe("normalizeIndianMobile", () => {
  it("normalises common Indian mobile formats to +91", () => {
    expect(normalizeIndianMobile("9876543210")).toBe("+919876543210");
    expect(normalizeIndianMobile("+91 98765 43210")).toBe("+919876543210");
    expect(normalizeIndianMobile("91-98765-43210")).toBe("+919876543210");
    expect(normalizeIndianMobile("098765 43210")).toBe("+919876543210");
  });

  it("rejects numbers that are not valid 10-digit Indian mobiles", () => {
    expect(normalizeIndianMobile("12345")).toBe("");
    expect(normalizeIndianMobile("1234567890")).toBe("");
    expect(normalizeIndianMobile("+1 415 555 2671")).toBe("");
    expect(normalizeIndianMobile("not a number")).toBe("");
  });
});

describe("leadInput", () => {
  const valid = { name: "Rahul Sharma", email: "Aspirant@Example.com ", phone: "9876543210" };

  it("accepts a valid lead", () => {
    const parsed = leadInput.parse(valid);
    expect(parsed.name).toBe("Rahul Sharma");
    expect(parsed.phone).toBe("9876543210");
  });

  it("rejects a bad phone, email or name", () => {
    expect(leadInput.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
    expect(leadInput.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(leadInput.safeParse({ ...valid, name: "R" }).success).toBe(false);
  });
});

describe("toLeadPayload", () => {
  it("lowercases email, normalises phone and stamps the time", () => {
    const payload = toLeadPayload(
      { name: "Asha", email: "  Asha@Example.COM ", phone: "098765 43210" },
      new Date("2026-01-02T03:04:05.000Z")
    );
    expect(payload).toEqual({
      timestamp: "2026-01-02T03:04:05.000Z",
      name: "Asha",
      email: "asha@example.com",
      phone: "+919876543210",
    });
  });
});

describe("waitlist.submit", () => {
  const originalUrl = ENV.leadWebhookUrl;
  const originalSecret = ENV.leadWebhookSecret;

  beforeEach(() => {
    ENV.leadWebhookUrl = "";
    ENV.leadWebhookSecret = "";
  });

  afterEach(() => {
    ENV.leadWebhookUrl = originalUrl;
    ENV.leadWebhookSecret = originalSecret;
    vi.unstubAllGlobals();
  });

  const input = { name: "Rahul Sharma", email: "rahul@example.com", phone: "9876543210" };

  it("fails open when no webhook is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await caller.submit(input);

    expect(result).toEqual({ ok: true, delivered: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the normalised lead to the webhook", async () => {
    ENV.leadWebhookUrl = "https://script.google.com/macros/s/example/exec";
    ENV.leadWebhookSecret = "shared-secret";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await caller.submit(input);

    expect(result).toEqual({ ok: true, delivered: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(ENV.leadWebhookUrl);
    expect(init.method).toBe("POST");
    expect(init.headers["x-lead-secret"]).toBe("shared-secret");
    expect(JSON.parse(init.body)).toMatchObject({
      name: "Rahul Sharma",
      email: "rahul@example.com",
      phone: "+919876543210",
    });
  });

  it("reports not delivered when the webhook fails", async () => {
    ENV.leadWebhookUrl = "https://script.google.com/macros/s/example/exec";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const result = await caller.submit(input);

    expect(result).toEqual({ ok: true, delivered: false });
  });

  it("ignores submissions that fill the honeypot", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await caller.submit({ ...input, company: "spam bot" });

    expect(result).toEqual({ ok: true, delivered: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
