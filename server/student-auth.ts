import { createHash, randomBytes, scrypt as rawScrypt, timingSafeEqual } from "node:crypto";
import { parse as parseCookie } from "cookie";
import { and, eq, gt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { assessmentAttempts, studentSessions, students, type Student } from "../drizzle/schema.js";
import { getDb } from "./db.js";
import type { TrpcContext } from "./_core/context.js";

const COOKIE = "lp_student";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
function derive(password: string, salt: string, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => rawScrypt(password, salt, 64, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (error, value) => error ? reject(error) : resolve(value)));
}

export function normalizeEmail(input: string) { return input.trim().toLowerCase(); }
export function normalizeMobile(input: string) {
  const digits = input.replace(/\D/g, "");
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  if (/^\d{10,15}$/.test(digits)) return `+${digits}`;
  return "";
}
export function isValidMobile(input: string) { return Boolean(normalizeMobile(input)); }

/** Compatible with Werkzeug's scrypt:32768:8:1$salt$hex legacy hashes. */
export async function verifyPassword(password: string, stored: string) {
  const [method, salt, hex] = stored.split("$");
  const match = /^scrypt:(\d+):(\d+):(\d+)$/.exec(method || "");
  if (!match || !salt || !hex || !/^[0-9a-f]+$/i.test(hex)) return false;
  const [n, r, p] = match.slice(1).map(Number);
  if (n !== 32768 || r !== 8 || p !== 1 || hex.length !== 128) return false;
  const computed = await derive(password, salt, n, r, p);
  return timingSafeEqual(computed, Buffer.from(hex, "hex"));
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = await derive(password, salt, 32768, 8, 1);
  return `scrypt:32768:8:1$${salt}$${digest.toString("hex")}`;
}
function digest(raw: string) { return createHash("sha256").update(raw).digest("hex"); }
function dbRequired(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Student accounts are temporarily unavailable. Please try again." });
  return db;
}
export async function issueSession(ctx: TrpcContext, studentId: number) {
  const db = dbRequired(await getDb());
  const raw = randomBytes(32).toString("base64url");
  await db.insert(studentSessions).values({ studentId, tokenHash: digest(raw), createdAt: Date.now(), expiresAt: Date.now() + SESSION_MS });
  ctx.res.cookie(COOKIE, raw, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MS });
}
export async function clearSession(ctx: TrpcContext) {
  const raw = parseCookie(ctx.req.headers.cookie || "")[COOKIE];
  const db = await getDb();
  if (raw && db) await db.delete(studentSessions).where(eq(studentSessions.tokenHash, digest(raw)));
  ctx.res.clearCookie(COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
}
export async function getStudentSession(ctx: TrpcContext): Promise<Student | null> {
  const raw = parseCookie(ctx.req.headers.cookie || "")[COOKIE];
  if (!raw) return null;
  const db = dbRequired(await getDb());
  const found = await db.select({ student: students }).from(studentSessions)
    .innerJoin(students, eq(studentSessions.studentId, students.id))
    .where(and(eq(studentSessions.tokenHash, digest(raw)), gt(studentSessions.expiresAt, Date.now()), eq(students.status, "Active"))).limit(1);
  return found[0]?.student ?? null;
}
export async function studentProfile(student: Student) {
  const db = dbRequired(await getDb());
  const rows = await db.select({ attempted: sql<number>`count(*)`, completed: sql<number>`sum(case when ${assessmentAttempts.status} = 'completed' then 1 else 0 end)`, average: sql<number>`coalesce(avg(${assessmentAttempts.percentage}), 0)` })
    .from(assessmentAttempts).where(eq(assessmentAttempts.studentId, student.id));
  return {
    student_id: student.studentCode, full_name: student.fullName, email: student.email,
    user_role: "Defence Aspirant", profile_status: student.status,
    total_tests_attempted: Number(rows[0]?.attempted || 0), total_tests_completed: Number(rows[0]?.completed || 0), average_score: Math.round(Number(rows[0]?.average || 0)),
  };
}
