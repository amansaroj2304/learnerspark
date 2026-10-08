import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth.js";
import { registerStorageProxy } from "./storageProxy.js";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";
import { reportEnvStatus } from "./env.js";
import { securityHeaders } from "./security.js";
import { createRateLimiter } from "./rate-limit.js";
import { registerHealthRoutes } from "./health.js";

/**
 * Builds the application's Express instance with every API route wired up.
 *
 * This factory contains no server bootstrap (no `listen`, no Vite, no static
 * file serving) so it can be reused by both the long-running Node server
 * (`server/_core/index.ts`) and the Vercel Function entry point (`api/index.ts`).
 * Static assets and the SPA fallback are environment-specific and are added by
 * the caller.
 */
export function createApp(): Express {
  reportEnvStatus();

  const app = express();

  const apiLimiter = createRateLimiter({ windowMs: 60_000, max: 120 });
  const oauthLimiter = createRateLimiter({
    windowMs: 15 * 60_000,
    max: 30,
    message: "Too many login attempts. Please try again later.",
  });

  app.disable("x-powered-by");
  // Behind a host's reverse proxy, trust one hop so req.ip reflects the client.
  if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
  app.use(securityHeaders);
  // Register platform routes at both the root (Docker/local) and the `/api`
  // prefix (Vercel, where the function is mounted under `/api`).
  registerHealthRoutes(app);
  registerHealthRoutes(app, "/api");
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use("/api/oauth", oauthLimiter);
  registerStorageProxy(app);
  registerStorageProxy(app, "/api");
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    apiLimiter,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}
