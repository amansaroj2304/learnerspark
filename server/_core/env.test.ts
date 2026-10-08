import { afterEach, describe, expect, it, vi } from "vitest";

const KEYS = ["NODE_ENV", "JWT_SECRET", "DATABASE_URL", "OAUTH_SERVER_URL"] as const;
const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

async function loadEnv(overrides: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const key of KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(overrides)) process.env[key] = value;
  vi.resetModules();
  return import("./env");
}

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
  vi.restoreAllMocks();
});

describe("reportEnvStatus", () => {
  it("does nothing outside production", async () => {
    const { reportEnvStatus } = await loadEnv({ NODE_ENV: "development" });
    expect(() => reportEnvStatus()).not.toThrow();
  });

  it("warns in production when JWT_SECRET is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { reportEnvStatus } = await loadEnv({ NODE_ENV: "production" });
    expect(() => reportEnvStatus()).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("JWT_SECRET"));
  });

  it("passes with JWT_SECRET set, warning about optional features", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { reportEnvStatus } = await loadEnv({ NODE_ENV: "production", JWT_SECRET: "s3cret" });
    expect(() => reportEnvStatus()).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("DATABASE_URL"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("OAUTH_SERVER_URL"));
  });
});
