import type { IncomingMessage, ServerResponse } from "node:http";

export default async function handler(
  _request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const out: Record<string, unknown> = { ok: false, node: process.version };
  try {
    const mod = await import("../server/_core/app");
    out.imported = true;
    const app = mod.createApp();
    out.created = typeof app === "function";
    out.ok = true;
    response.statusCode = 200;
  } catch (error) {
    out.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    out.stack = error instanceof Error ? error.stack : undefined;
    response.statusCode = 500;
  }
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(out));
}
