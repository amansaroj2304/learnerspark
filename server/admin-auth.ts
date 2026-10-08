import { createHash, randomBytes } from "node:crypto";
import { parse as parseCookie } from "cookie";
import { and, eq, gt } from "drizzle-orm";
import { adminAccounts, adminSessions } from "../drizzle/schema.js";
import { getDb } from "./db.js";
import type { TrpcContext } from "./_core/context.js";

const COOKIE = "lp_admin";
const MAX_AGE = 12 * 60 * 60 * 1000;
const digest = (raw: string) => createHash("sha256").update(raw).digest("hex");

export async function getAdminSession(ctx: TrpcContext) {
  const raw = parseCookie(ctx.req.headers.cookie || "")[COOKIE];
  if (!raw) return null;
  const db = await getDb(); if (!db) return null;
  const rows = await db.select({ admin: adminAccounts }).from(adminSessions)
    .innerJoin(adminAccounts, eq(adminSessions.adminId, adminAccounts.id))
    .where(and(eq(adminSessions.tokenHash, digest(raw)), gt(adminSessions.expiresAt, Date.now()), eq(adminAccounts.status, "active"))).limit(1);
  return rows[0]?.admin ?? null;
}
export async function issueAdminSession(ctx: TrpcContext, adminId: number) {
  const db = await getDb(); if (!db) throw Error("Database unavailable");
  const raw = randomBytes(32).toString("base64url");
  await db.insert(adminSessions).values({ adminId, tokenHash: digest(raw), expiresAt: Date.now() + MAX_AGE });
  ctx.res.cookie(COOKIE, raw, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE });
}
export async function clearAdminSession(ctx: TrpcContext) {
  const raw = parseCookie(ctx.req.headers.cookie || "")[COOKIE];
  const db = await getDb();
  if (raw && db) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, digest(raw)));
  ctx.res.clearCookie(COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
}
