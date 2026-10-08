import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";

function walk(dir: string, depth: number, acc: string[] = []): string[] {
  if (depth < 0) return acc;
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    acc.push(`ERR ${dir}: ${error instanceof Error ? error.message : String(error)}`);
    return acc;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = `${dir}/${entry.name}`;
    acc.push(path);
    if (entry.isDirectory()) walk(path, depth - 1, acc);
  }
  return acc;
}

export default async function handler(
  _request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const out: Record<string, unknown> = {
    cwd: process.cwd(),
    node: process.version,
    varTask: fs.existsSync("/var/task") ? walk("/var/task", 2) : "no /var/task",
  };
  const tries = [
    "../server/_core/app.js",
    "../server/_core/app.ts",
    "../server/_core/app",
  ];
  const results: Record<string, string> = {};
  for (const specifier of tries) {
    try {
      await import(specifier);
      results[specifier] = "ok";
    } catch (error) {
      results[specifier] = error instanceof Error ? error.message : String(error);
    }
  }
  out.imports = results;
  response.statusCode = 200;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(out));
}
