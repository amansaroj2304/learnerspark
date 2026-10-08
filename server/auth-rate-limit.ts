import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { authRateLimits } from "../drizzle/schema.js";
import { getDb } from "./db.js";

const WINDOW = 15 * 60 * 1000;
const LIMIT = 8;
function key(kind: "student" | "admin", identifier: string) {
  return createHash("sha256").update(`${kind}:${identifier.toLowerCase().trim()}`).digest("hex");
}
export async function assertLoginAllowed(kind: "student" | "admin", identifier: string) {
  const db = await getDb(); if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
  const [row] = await db.select().from(authRateLimits).where(eq(authRateLimits.keyHash, key(kind, identifier))).limit(1);
  if (row && row.windowStart + WINDOW > Date.now() && (row.blockedUntil > Date.now() || row.failures >= LIMIT))
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many login attempts. Please try again in 15 minutes." });
}
export async function noteLoginFailure(kind: "student" | "admin", identifier: string) {
  const db = await getDb(); if (!db) return;
  const now = Date.now();
  await db.insert(authRateLimits).values({ keyHash: key(kind, identifier), failures: 1, windowStart: now, blockedUntil: 0 })
    .onDuplicateKeyUpdate({ set: {
      blockedUntil: sql`IF(${authRateLimits.windowStart} < ${now - WINDOW}, 0, IF(${authRateLimits.failures} + 1 >= ${LIMIT}, ${now + WINDOW}, 0))`,
      failures: sql`IF(${authRateLimits.windowStart} < ${now - WINDOW}, 1, ${authRateLimits.failures} + 1)`,
      windowStart: sql`IF(${authRateLimits.windowStart} < ${now - WINDOW}, ${now}, ${authRateLimits.windowStart})`,
    } });
}
export async function resetLoginLimit(kind: "student" | "admin", identifier: string) {
  const db = await getDb();
  if (db) await db.delete(authRateLimits).where(eq(authRateLimits.keyHash, key(kind, identifier)));
}
