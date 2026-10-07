import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@shared/api";

// The student account service is hosted with the public site. One HttpOnly
// cookie is shared by CSSS and OPAM; no bearer tokens or passwords are stored
// in localStorage, and the old contact-only recognition path is not used.
//
// Set to `false` to run the assessments as a guest (no login gate) while no
// account database is configured. Flip back to `true` once `DATABASE_URL` is
// set so results sync to student profiles again.
export const isAccountServiceEnabled = false;

const api = createTRPCProxyClient<AppRouter>({
  links: [httpBatchLink({
    url: "/api/trpc", transformer: superjson,
    fetch(input, init) { return globalThis.fetch(input, { ...init, credentials: "include" }); },
  })],
});

// Shared with other client libs (e.g. leads) so a single tRPC proxy is reused.
export { api };

export type StudentProfile = {
  student_id: string;
  full_name: string;
  email?: string;
  user_role: string;
  profile_status: string;
  total_tests_attempted: number;
  total_tests_completed: number;
  average_score: number;
};

export async function recognizeStudent(): Promise<StudentProfile | null> {
  try { return await api.student.me.query(); }
  catch { return null; }
}
export async function registerStudent(payload: Record<string, unknown>): Promise<StudentProfile> {
  // The registration form validates required fields; the server repeats and
  // enforces all checks, consent, and uniqueness under database constraints.
  return api.student.register.mutate(payload as Parameters<typeof api.student.register.mutate>[0]);
}
export async function loginStudent(identifier: string, password: string): Promise<StudentProfile> {
  return api.student.login.mutate({ identifier, password });
}
export async function logoutStudent() {
  await api.student.logout.mutate();
}
export async function saveAssessmentAttempt(testSlug: "csss" | "opam", testName: string, score: number, percentage: number) {
  // Local results remain available if a network request fails, but the caller
  // must be authenticated before starting a new assessment.
  try {
    await api.student.saveAttempt.mutate({ attemptId: crypto.randomUUID(), testSlug, testName, score, percentage });
  } catch (error) {
    console.warn("Assessment could not be synced; the local result remains available.", error);
  }
}
