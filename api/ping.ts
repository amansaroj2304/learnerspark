import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(_request: IncomingMessage, response: ServerResponse): void {
  response.statusCode = 200;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify({ ok: true, ping: true, node: process.version }));
}
