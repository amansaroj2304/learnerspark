import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { assessmentAttempts, students } from "../../drizzle/schema.js";
import { getDb } from "../db.js";
import { clearSession, getStudentSession, hashPassword, isValidMobile, issueSession, normalizeEmail, normalizeMobile, studentProfile, verifyPassword } from "../student-auth.js";
import { publicProcedure, router } from "../_core/trpc.js";
import { assertLoginAllowed, noteLoginFailure, resetLoginLimit } from "../auth-rate-limit.js";

const registration = z.object({
  full_name: z.string().trim().min(2).max(120), email: z.string().email().max(320),
  mobile: z.string().min(10).max(22), password: z.string().min(8).max(128),
  date_of_birth: z.string().min(8).max(12), gender: z.string().min(1).max(40),
  education_level: z.string().min(1).max(80), defence_entry: z.string().min(1).max(80),
  target_exam: z.string().max(120).optional(), attempt_year: z.string().max(10).optional(),
  previous_ssb_experience: z.string().max(80).optional(), state: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80), consent: z.literal(true),
});
const loginInput = z.object({ identifier: z.string().trim().min(3).max(320), password: z.string().min(1).max(128) });
function unavailable(): never { throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Student accounts are temporarily unavailable. Please try again." }); }

export const studentRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    const student = await getStudentSession(ctx);
    return student ? studentProfile(student) : null;
  }),
  register: publicProcedure.input(registration).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) return unavailable();
    const email = normalizeEmail(input.email), mobile = normalizeMobile(input.mobile);
    if (!isValidMobile(input.mobile)) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid mobile number." });
    const existing = await db.select({ id: students.id }).from(students)
      .where(or(eq(students.email, email), eq(students.mobile, mobile))).limit(1);
    if (existing.length) throw new TRPCError({ code: "CONFLICT", message: "An account with this email or mobile already exists. Log in instead of registering again." });
    const code = `DA-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const passwordHash = await hashPassword(input.password);
    try {
      await db.insert(students).values({
        studentCode: code, email, mobile, passwordHash, fullName: input.full_name,
        dateOfBirth: input.date_of_birth, gender: input.gender, educationLevel: input.education_level,
        defenceEntry: input.defence_entry, targetExam: input.target_exam || null,
        attemptYear: input.attempt_year || null, previousSsbExperience: input.previous_ssb_experience || null,
        state: input.state, city: input.city, status: "Active", consentAt: Date.now(), createdAt: Date.now(),
      });
    } catch (error) {
      if (String(error).includes("Duplicate entry") || (error as { code?: string }).code === "ER_DUP_ENTRY")
        throw new TRPCError({ code: "CONFLICT", message: "An account with this email or mobile already exists. Log in instead of registering again." });
      throw error;
    }
    const [student] = await db.select().from(students).where(eq(students.studentCode, code)).limit(1);
    if (!student) return unavailable();
    await issueSession(ctx, student.id);
    return studentProfile(student);
  }),
  login: publicProcedure.input(loginInput).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) return unavailable();
    const email = normalizeEmail(input.identifier), mobile = normalizeMobile(input.identifier);
    const key = mobile || email;
    await assertLoginAllowed("student", key);
    const matches = await db.select().from(students).where(and(
      or(eq(students.email, email), eq(students.mobile, mobile || "invalid")), eq(students.status, "Active")
    )).limit(1);
    const student = matches[0];
    if (!student || !(await verifyPassword(input.password, student.passwordHash))) {
      await noteLoginFailure("student", key);
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email/mobile number or password." });
    }
    await resetLoginLimit("student", key);
    await db.update(students).set({ lastLoginAt: Date.now() }).where(eq(students.id, student.id));
    await issueSession(ctx, student.id);
    return studentProfile(student);
  }),
  logout: publicProcedure.mutation(async ({ ctx }) => { await clearSession(ctx); return { ok: true }; }),
  saveAttempt: publicProcedure.input(z.object({
    attemptId: z.string().uuid(), testSlug: z.enum(["csss", "opam"]), testName: z.string().min(1).max(120),
    score: z.number().int().min(0).max(120), percentage: z.number().int().min(0).max(100),
  })).mutation(async ({ ctx, input }) => {
    const student = await getStudentSession(ctx);
    if (!student) throw new TRPCError({ code: "UNAUTHORIZED", message: "Log in to save your attempt." });
    const db = await getDb(); if (!db) return unavailable();
    // Retrying a result after a network timeout must not count it twice.
    const existing = await db.select({ id: assessmentAttempts.id, studentId: assessmentAttempts.studentId }).from(assessmentAttempts)
      .where(eq(assessmentAttempts.attemptId, input.attemptId)).limit(1);
    if (existing.length) {
      if (existing[0].studentId !== student.id) throw new TRPCError({ code: "CONFLICT" });
      return { saved: true, duplicate: true };
    }
    try {
      await db.insert(assessmentAttempts).values({
        attemptId: input.attemptId, studentId: student.id, testSlug: input.testSlug,
        testName: input.testName, score: input.score, percentage: input.percentage,
        status: "completed", createdAt: Date.now(),
      });
    } catch (error) {
      if (String(error).includes("Duplicate entry") || (error as { code?: string }).code === "ER_DUP_ENTRY") return { saved: true, duplicate: true };
      throw error;
    }
    return { saved: true, duplicate: false };
  }),
});
