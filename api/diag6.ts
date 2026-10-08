import type { IncomingMessage, ServerResponse } from "node:http";
import express from "express";

export default function handler(_request: IncomingMessage, response: ServerResponse): void {
  response.statusCode = 200;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify({ ok: true, express: typeof express }));
}
