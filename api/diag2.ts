import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../server/_core/app";

export default function handler(_request: IncomingMessage, response: ServerResponse): void {
  try {
    const app = createApp();
    response.statusCode = 200;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ ok: true, app: typeof app }));
  } catch (error) {
    response.statusCode = 500;
    response.setHeader("content-type", "application/json");
    response.end(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      })
    );
  }
}
