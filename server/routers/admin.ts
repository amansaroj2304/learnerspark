import { TRPCError } from "@trpc/server";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { adminAccounts, assessmentAttempts, managedQuestions, managedTests, students } from "../../drizzle/schema.js";
import { getDb } from "../db.js";
import { publicProcedure, router } from "../_core/trpc.js";
import { clearAdminSession, getAdminSession, issueAdminSession } from "../admin-auth.js";
import { assertLoginAllowed, noteLoginFailure, resetLoginLimit } from "../auth-rate-limit.js";
import { verifyPassword } from "../student-auth.js";

const adminOnly = publicProcedure.use(async ({ ctx, next }) => {
  const ownerOAuth = Boolean(process.env.OWNER_OPEN_ID && ctx.user?.openId === process.env.OWNER_OPEN_ID);
  if (!ownerOAuth && !(await getAdminSession(ctx)))
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner authorization required." });
  return next({ ctx });
});
async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Managed database is unavailable." });
  return db;
}
const testInput = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{2,80}$/), title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(1).max(3000), duration: z.number().int().min(0).max(86400),
  difficulty: z.string().trim().min(1).max(32), status: z.enum(["draft", "published", "archived"]),
});
const questionInput = z.object({
  testId: z.number().int().positive().nullable(), prompt: z.string().trim().min(1).max(5000),
  questionType: z.string().trim().min(1).max(60), formatLabel: z.string().trim().min(1).max(100),
  options: z.string().max(5000), correctAnswer: z.string().max(2000), explanation: z.string().max(5000),
  category: z.string().trim().min(1).max(80), difficulty: z.string().trim().min(1).max(32),
  status: z.enum(["draft", "published", "archived"]),
});

export const adminRouter = router({
  status: publicProcedure.query(async ({ ctx }) => {
    const session = await getAdminSession(ctx);
    const ownerOAuth = Boolean(process.env.OWNER_OPEN_ID && ctx.user?.openId === process.env.OWNER_OPEN_ID);
    return { signedIn: Boolean(session || ctx.user), isAdmin: Boolean(session || ownerOAuth),
      authType: session ? "password" : ownerOAuth ? "oauth" : null,
      name: session?.username || ctx.user?.name || null };
  }),
  login: publicProcedure.input(z.object({ username: z.string().trim().min(1).max(100), password: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      const username = input.username.trim().toLowerCase();
      await assertLoginAllowed("admin", username);
      const [account] = await db.select().from(adminAccounts).where(eq(adminAccounts.username, username)).limit(1);
      if (!account || account.status !== "active" || !(await verifyPassword(input.password, account.passwordHash))) {
        await noteLoginFailure("admin", username);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid administrator credentials." });
      }
      await resetLoginLimit("admin", username);
      await db.update(adminAccounts).set({ lastLoginAt: Date.now() }).where(eq(adminAccounts.id, account.id));
      await issueAdminSession(ctx, account.id);
      return { success: true };
    }),
  logout: publicProcedure.mutation(async ({ ctx }) => { await clearAdminSession(ctx); return { success: true }; }),
  dashboard: adminOnly.query(async () => {
    const db = await database();
    const [s, a, t, q, last] = await Promise.all([
      db.select({ value: sql<number>`count(*)` }).from(students),
      db.select({ value: sql<number>`count(*)` }).from(assessmentAttempts),
      db.select({ value: sql<number>`count(*)` }).from(managedTests),
      db.select({ value: sql<number>`count(*)` }).from(managedQuestions),
      db.select({ when: assessmentAttempts.createdAt, test: assessmentAttempts.testSlug, score: assessmentAttempts.percentage })
        .from(assessmentAttempts).orderBy(desc(assessmentAttempts.createdAt)).limit(8),
    ]);
    return { students: Number(s[0]?.value || 0), attempts: Number(a[0]?.value || 0), tests: Number(t[0]?.value || 0), questions: Number(q[0]?.value || 0), recent: last };
  }),
  students: adminOnly.input(z.object({ search: z.string().max(100).default("") }).default({ search: "" })).query(async ({ input }) => {
    const db = await database();
    const search = input.search.trim();
    return db.select({ id: students.id, studentCode: students.studentCode, fullName: students.fullName, email: students.email, mobile: students.mobile,
      defenceEntry: students.defenceEntry, status: students.status, createdAt: students.createdAt })
      .from(students)
      .where(search ? or(like(students.fullName, `%${search}%`), like(students.email, `%${search}%`), like(students.studentCode, `%${search}%`)) : undefined)
      .orderBy(desc(students.createdAt)).limit(200);
  }),
  student: adminOnly.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = await database();
    const [record] = await db.select({ id: students.id, studentCode: students.studentCode, fullName: students.fullName, email: students.email, mobile: students.mobile,
      dateOfBirth: students.dateOfBirth, gender: students.gender, educationLevel: students.educationLevel, defenceEntry: students.defenceEntry,
      targetExam: students.targetExam, attemptYear: students.attemptYear, previousSsbExperience: students.previousSsbExperience,
      state: students.state, city: students.city, status: students.status, createdAt: students.createdAt, lastLoginAt: students.lastLoginAt })
      .from(students).where(eq(students.id, input.id)).limit(1);
    if (!record) throw new TRPCError({ code: "NOT_FOUND" });
    const attempts = await db.select({ attemptId: assessmentAttempts.attemptId, testSlug: assessmentAttempts.testSlug, testName: assessmentAttempts.testName,
      score: assessmentAttempts.score, percentage: assessmentAttempts.percentage, createdAt: assessmentAttempts.createdAt })
      .from(assessmentAttempts).where(eq(assessmentAttempts.studentId, input.id)).orderBy(desc(assessmentAttempts.createdAt));
    return { record, attempts };
  }),
  attempts: adminOnly.query(async () => {
    const db = await database();
    return db.select({ studentCode: students.studentCode, fullName: students.fullName, testSlug: assessmentAttempts.testSlug,
      testName: assessmentAttempts.testName, score: assessmentAttempts.score, percentage: assessmentAttempts.percentage,
      createdAt: assessmentAttempts.createdAt })
      .from(assessmentAttempts).innerJoin(students, eq(students.id, assessmentAttempts.studentId))
      .orderBy(desc(assessmentAttempts.createdAt)).limit(200);
  }),
  tests: adminOnly.query(async () => (await database()).select().from(managedTests).orderBy(managedTests.id)),
  questions: adminOnly.input(z.object({ testId: z.number().int().positive().optional() }).default({})).query(async ({ input }) => {
    const db = await database();
    return db.select().from(managedQuestions).where(input.testId ? eq(managedQuestions.testId, input.testId) : undefined)
      .orderBy(managedQuestions.id).limit(500);
  }),
  saveTest: adminOnly.input(testInput.extend({ id: z.number().int().positive().optional() })).mutation(async ({ input }) => {
    const db = await database(); const { id, ...values } = input;
    if (id) {
      await db.update(managedTests).set({ ...values, updatedAt: Date.now() }).where(eq(managedTests.id, id));
      return { id };
    }
    const result = await db.insert(managedTests).values({ ...values, createdAt: Date.now(), updatedAt: Date.now() });
    return { id: Number(result[0].insertId) };
  }),
  saveQuestion: adminOnly.input(questionInput.extend({ id: z.number().int().positive().optional() })).mutation(async ({ input }) => {
    const db = await database(); const { id, ...values } = input;
    if (id) {
      await db.update(managedQuestions).set(values).where(eq(managedQuestions.id, id));
      return { id };
    }
    const result = await db.insert(managedQuestions).values({ ...values, createdAt: Date.now() });
    return { id: Number(result[0].insertId) };
  }),
});
