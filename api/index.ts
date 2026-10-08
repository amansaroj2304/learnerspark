import type { IncomingMessage, ServerResponse } from "node:http";
import type { Express, Request, Response } from "express";

let appPromise: Promise<Express> | null = null;

/**
 * Builds the Express application on first use and caches it across invocations
 * of the same warm function instance. Loading lazily keeps a configuration
 * error from crashing the module before we can return a readable response.
 */
function loadApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = import("../server/_core/app")
      .then(({ createApp }) => createApp())
      .catch((error) => {
        appPromise = null;
        throw error;
      });
  }
  return appPromise;
}

/**
 * Vercel Function entry point, shared by every file under `api/`.
 *
 * The Express application is invoked as a Node `(request, response)` handler so
 * Vercel's Node.js runtime runs it directly. Request paths are preserved, so
 * `/api/trpc`, `/api/oauth`, `/healthz`, and `/manus-storage` all resolve inside
 * Express. Static assets and the SPA are served by Vercel from `dist/public`
 * (see `vercel.json`).
 */
export default async function handler(
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  try {
    const app = await loadApp();
    app(request as Request, response as Response);
  } catch (error) {
    console.error("[api] request failed before the app could handle it", error);
    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader("content-type", "application/json");
    }
    response.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}
