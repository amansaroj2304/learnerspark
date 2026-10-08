// `/api/trpc/<procedure>` — every tRPC procedure is a single path segment
// (e.g. `waitlist.submit`, `system.health`), so one dynamic segment is enough.
export { default } from "../index";
