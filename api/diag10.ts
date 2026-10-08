import type { IncomingMessage, ServerResponse } from "node:http";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, depth = 0): string[] {
  if (depth > 3) return [];
  let entries: string[] = [];
  try {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      entries.push(full);
      try {
        if (statSync(full).isDirectory()) entries = entries.concat(walk(full, depth + 1));
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return entries;
}

export default async function handler(
  _request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const out: Record<string, unknown> = {
    cwd: process.cwd(),
    node: process.version,
    tree: walk("/var/task"),
  };
  const specs = ["../server/_core/app.js", "../server/_core/app", "../server/_core/app.ts"];
  const imports: Record<string, string> = {};
  for (const spec of specs) {
    try {
      const mod = await import(spec);
      imports[spec] = `OK keys=${Object.keys(mod).join(",")}`;
    } catch (error) {
      imports[spec] = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }
  }
  out.imports = imports;
  response.statusCode = 200;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(out));
}
