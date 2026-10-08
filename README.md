# Learners Park

Learners Park is an independent, mobile-first practice platform for Indian defence aspirants preparing for SSB Stage 1. The current build is **Phase 2**: the home narrative plus functional CSSS and OPAM practice engines backed by complete original content banks. The engines run fully on-device by default — no account or network connection is required. The same deployment also ships an optional full-stack backend (Express + tRPC + Drizzle/MySQL) for student accounts, saved attempts, and the admin console; it activates automatically when the server variables below are configured (see [Configuration](#configuration)).

## Phase 2 included

- Editorial home page with the Learners Park brand system, Stage 1 explainer, 15 OLQ grouping, differentiators, testimonials, trust notice, and official links.
- CSSS practice engine at `/csss`: 70 original items across five sections split 15/15/15/15/10, with hard per-question timers shortened by 10 seconds, no back navigation, section pauses, local response timing, verbal and non-verbal reasoning items, and an audio-only auditory section where each spoken cue autoplays once without printing the sequence.
- OPAM practice engine at `/opam`: 120 original items across 60 self-description statements, 35 forced-choice pairs, and 25 situation reactions, with a 15-second soft timer, no back navigation, local response latency, shuffled situation option order, and mentor-style debrief output.
- Placeholder routes for `/tests`, `/briefs`, and `/guides` that are intentionally labeled as Phase 2/3 rather than dead links.
- SEO metadata, responsive mobile layouts, PWA manifest, robots file, and reduced-motion support.

The banks use original practice content. They are not official question banks or official psychometric instruments and must not be presented as such. The repository includes `scripts/verify-banks.ts`, which checks counts, unique IDs and prompts, answer indexes, forced-pair tags, shuffled situation keys, and known typo regressions.

## Content format for the next phases

Keep question banks as TypeScript data modules or JSON files with one object per item. A written-test item should follow this shape:

```ts
{
  id: "nda-maths-001",
  exam: "NDA",
  section: "Mathematics",
  difficulty: "Standard",
  prompt: "Original question text here",
  options: ["A", "B", "C", "D"],
  answer: 1,
  explanation: "Plain-language reasoning, not just the option letter.",
  marks: 2,
  negativeMarks: 0.66
}
```

A brief should follow this shape:

```ts
{
  id: "brief-2026-09-23-01",
  date: "2026-09-23",
  category: "Defence Deals",
  title: "Original headline",
  summary: "80–150 word original summary.",
  ssbAngle: "How this could enter a GD, lecturette, or interview.",
  sources: [{ label: "Official source", href: "https://example.com" }]
}
```

An OPAM item should retain the item type, trait mapping, reverse-pair key where applicable, and scenario options. Do not mix personal response data into the content files. Response latency belongs on-device unless the learner explicitly opts in to saving a history.

## Configuration

Copy `.env.example` to `.env` and fill in what you need. The SPA (CSSS/OPAM) runs with no variables; the values below enable the backend features.

**Server**

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | for accounts/admin | MySQL connection string used by Drizzle ORM. Without it, accounts, saved attempts, and admin data are unavailable. |
| `JWT_SECRET` | for accounts | Secret used to sign session cookies. Use a long random value; an empty secret is insecure. |
| `OAUTH_SERVER_URL` | for admin login | OAuth provider base URL for owner/admin sign-in. Student email/mobile login does not need it. |
| `VITE_APP_ID` | for admin login | OAuth client id. |
| `OWNER_OPEN_ID` | no | openId granted the `admin` role. |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | no | Object storage used by the `/manus-storage` proxy. |

**Client (build-time)**

| Variable | Purpose |
|---|---|
| `VITE_OAUTH_PORTAL_URL` | OAuth portal used for the admin sign-in redirect. When unset, that button does nothing. |
| `VITE_APP_ID` | Same OAuth client id as above, read at build time. |

In production the server logs a `[env] WARNING` at boot for each missing variable. Every variable is optional: the public site and the lead form keep working without any of them, and a missing `JWT_SECRET` only disables session-based login.

Privacy behaviour follows from this: with no backend configured, no profile or result data leaves the browser, and the on-screen copy says so.

## Local development

```bash
pnpm install
pnpm dev              # Express + Vite dev server (HMR)
pnpm db:push          # apply Drizzle migrations (needs DATABASE_URL)
```

Validate before handoff:

```bash
pnpm check            # tsc --noEmit
pnpm test             # vitest
pnpm build            # vite build + bundle server to dist/index.js
pnpm start            # run the production server (NODE_ENV=production)
```

`pnpm build` emits the SPA to `dist/public` and bundles the server to `dist/index.js`. The build isolates dev-only Vite code into a separate chunk, so `dist/index.js` has no runtime dependency on devDependencies and can run under `pnpm install --prod`.

## Deployment

This is a full-stack Node app. Deploy it to any host that runs a persistent Node process (Render, Railway, Fly.io, a VPS, or a container platform).

1. Provision MySQL and set `DATABASE_URL` (plus `JWT_SECRET`, and the OAuth variables if you use admin login).
2. Build and run: `pnpm install`, `pnpm build`, then `pnpm db:push` and `pnpm start`.
3. Set the platform's start command to `pnpm start` and expose the port via `PORT`.
4. Point the platform's health check at `GET /healthz` (liveness). Use `GET /readyz` for readiness — it pings MySQL when `DATABASE_URL` is set and returns `503` while the database is unreachable.
5. For a static-only host you can instead publish `dist/public` and add a history-fallback rewrite from `/*` to `/index.html` so `/opam` and `/csss` survive a refresh — but accounts, saved attempts, and admin features will be unavailable.

A `Dockerfile` is included (multi-stage, production dependencies only) if you prefer containers:

```bash
docker build -t learnerspark .
docker run -p 3000:3000 -e DATABASE_URL=... -e JWT_SECRET=... learnerspark
```

Security defaults: `helmet`-style headers are set on every response, HSTS/CSP in production, `X-Powered-By` is disabled, the API is rate-limited per IP, and per-account login limits back the student login route.

CI runs on every push and pull request via `.github/workflows/ci.yml` (typecheck, test, build).

Do not expose response data through a public API. The `/api/*` routes are the backend; keep secrets in the host's environment, never in the repo.

## Pointing `learnerspark.online`

1. Create the production deployment in Vercel or Netlify and copy the host's DNS targets.
2. At the domain registrar, add the host-provided apex and `www` records. Prefer the host's recommended ALIAS/ANAME for the apex; use a CNAME for `www` where supported.
3. Set `www.learnerspark.online` to redirect to the chosen canonical host.
4. Wait for DNS propagation, then enable the host-managed TLS certificate.
5. Verify `/`, `/opam`, and `/csss` directly and confirm that refreshes preserve client-side routing.

## Trust and compliance

Learners Park is independent and must not claim affiliation with the Indian Armed Forces, DIPR, or any Selection Board. Simulations are based on publicly known patterns and are for self-assessment only; they do not predict official results. Official information belongs at `joinindianarmy.nic.in`, `careerairforce.nic.in`, and `joinindiannavy.gov.in`.
