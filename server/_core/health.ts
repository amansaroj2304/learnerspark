import type { Express } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

/**
 * Liveness probe: the process is up and serving. Cheap, no dependencies.
 * Suitable for a platform's health check or an uptime monitor.
 */
export function registerHealthRoutes(app: Express, base = "") {
  app.get(`${base}/healthz`, (_req, res) => {
    res.status(200).json({
      status: "ok",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Readiness probe: verifies the database when one is configured. The app is
   * designed to run without a database, so an unconfigured DB reports ready
   * with `database: "disabled"` rather than failing.
   */
  app.get(`${base}/readyz`, async (_req, res) => {
    if (!process.env.DATABASE_URL) {
      res.status(200).json({ status: "ready", database: "disabled" });
      return;
    }
    try {
      const db = await getDb();
      if (!db) throw new Error("database unavailable");
      await db.execute(sql`SELECT 1`);
      res.status(200).json({ status: "ready", database: "ok" });
    } catch (error) {
      console.error("[health] readiness check failed", error);
      res.status(503).json({ status: "unavailable", database: "error" });
    }
  });
}
