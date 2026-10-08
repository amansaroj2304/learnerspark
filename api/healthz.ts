// Vercel maps each file under `api/` to a route. A single catch-all file does
// not match multi-segment paths on this project, so each API area has its own
// entry point that reuses the shared Express app from `./index`.
export { default } from "./index";
