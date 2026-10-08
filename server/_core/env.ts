export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  leadWebhookUrl: process.env.LEAD_WEBHOOK_URL ?? "",
  leadWebhookSecret: process.env.LEAD_WEBHOOK_SECRET ?? "",
};

/**
 * Reports production configuration at boot.
 *
 * Every setting is optional: the SPA (CSSS/OPAM) and the pre-test lead form run
 * without any environment variables. Missing values only disable the features
 * that depend on them, so they are reported as warnings rather than aborting
 * startup. In particular, a missing `JWT_SECRET` disables session cookies
 * (admin/student login) but does not stop the API from serving public routes
 * such as the lead-form submission.
 */
export function reportEnvStatus(): void {
  if (!ENV.isProduction) return;

  const warnings: string[] = [];
  if (!ENV.databaseUrl) {
    warnings.push(
      "DATABASE_URL is not set — student accounts, saved attempts, and admin data will be unavailable."
    );
  }
  if (!ENV.oAuthServerUrl) {
    warnings.push(
      "OAUTH_SERVER_URL is not set — owner/admin OAuth login is disabled (student login is unaffected)."
    );
  }
  if (!ENV.leadWebhookUrl) {
    warnings.push(
      "LEAD_WEBHOOK_URL is not set — lead-form submissions (name/email/phone) will not be delivered."
    );
  }
  if (!ENV.cookieSecret) {
    warnings.push(
      "JWT_SECRET is not set — session cookies would be signed with an insecure empty secret, so admin/student login is disabled."
    );
  }

  for (const warning of warnings) {
    console.warn(`[env] WARNING: ${warning}`);
  }
}
