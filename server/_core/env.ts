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
 * Validates and reports production configuration at boot.
 *
 * The SPA (CSSS/OPAM) runs without any environment variables, so missing
 * `DATABASE_URL` and `OAUTH_SERVER_URL` are warnings that disable the relevant
 * features. A missing `JWT_SECRET` is treated as fatal in production because
 * it would sign session cookies with an empty secret; set
 * `SKIP_ENV_VALIDATION=1` to downgrade it to a warning if you know what you
 * are doing.
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
    const message =
      "JWT_SECRET is not set — session cookies would be signed with an insecure empty secret.";
    if (process.env.SKIP_ENV_VALIDATION === "1") {
      warnings.push(message);
    } else {
      throw new Error(
        `[env] ${message} Set JWT_SECRET, or SKIP_ENV_VALIDATION=1 to bypass this check.`
      );
    }
  }

  for (const warning of warnings) {
    console.warn(`[env] WARNING: ${warning}`);
  }
}
