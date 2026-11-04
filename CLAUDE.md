# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Automatic printing for print/photocopy shops in Bangladesh. A customer scans a shop's QR code, uploads a PDF, picks black & white or color and copies, pays with bKash (or cash at the counter), and the job prints automatically on a printer in the shop.

Three roles:

- **Admin**: Google accounts listed in `ADMIN_EMAILS`, at `/admin`.
- **Shop owner**: Google login, at `/dashboard`.
- **Customer**: no login. Uses `/s/[slug]` to order and `/j/[publicId]` to watch the job.

**`PROJECT.md` is the project tracker**: goals, design decisions, what's done, the roadmap and open items. Read it before starting work. Update it when a feature lands, a decision changes or a question is answered: tick the checkboxes, add a change-log row and bump the date.

## Commands

```bash
docker compose up -d          # MongoDB (single-node replica set rs0); PDFs live in it via GridFS
npm run dev                   # Next.js dev server (http://localhost:3000)
npm run build                 # production build — also catches Cache Components violations
npm run lint                  # eslint
npx tsc --noEmit              # typecheck
npm run dev:agent -- <CODE>   # fake shop PC (scripts/dev-agent.mjs); pair with a code from Dashboard → Devices
```

There is no test suite. Verify changes with `tsc`, `eslint`, `next build`, and by exercising the flow end-to-end with the dev agent.

## Next.js 16 with Cache Components (read AGENTS.md)

This is Next 16.4 with `cacheComponents: true` and `partialPrefetching: true`. APIs differ from older versions, so check `node_modules/next/dist/docs/` before using a Next API. Rules this codebase follows:

- **Dynamic work goes behind `<Suspense>`.** Any component that reads cookies, params, searchParams or the DB must sit inside a boundary. Pages are a static shell plus an async inner component, e.g. `export default function Page() { return <Suspense><Content/></Suspense> }`.
- **Public pages call `await connection()` before DB reads.** Mongoose uses `new Date()` internally, which otherwise errors during prerender.
- **No time or random calls in render.** Don't call `Date.now()` or `new Date()` directly in server component render; use helpers such as `daysAgo()` and `subscriptionExpired()` in `lib/jobs.ts`. The `react-hooks/purity` lint rule flags this.
- **Middleware is `proxy.ts`.** It's an optimistic cookie-presence check only; real auth happens in `lib/auth.ts`.
- **`params` and `searchParams` are Promises.**
- **Server actions return `ActionResult` (`lib/action-result.ts`) and call `refresh()` after mutations.** Never `redirect()` inside an action invoked through `useAction`: its try/catch swallows the redirect and shows a generic error. Return `{ ok: true }` and navigate on the client.
- **The dashboard sidebar shell renders outside Suspense.** User-specific bits stream into slots (see `app/dashboard/layout.tsx`). Streaming the whole `<Sidebar>` caused hydration mismatches on mobile.

## Architecture

```
Customer browser ──upload PDF──►
Next.js (pages + route handlers + server actions) ◄──HTTPS polling── Print agent on shop PC ──► Windows printers
       │
    MongoDB
```

### Data and services

- **`lib/models.ts`** holds all Mongoose models: User, Shop, Agent (shop PC), Device (printer), PrintJob.
  - Shop's `pricing`, `bkash` and `cash` fields are required subdocuments with defaults, so they're typed as non-optional.
  - Abandoned draft jobs are removed by a TTL index on `draftExpiresAt`.
- **`lib/env.ts`** wraps env vars in getters, so missing vars fail at use time, not at build time.
- **`lib/storage.ts`** stores PDFs in MongoDB GridFS (bucket `printFiles`) only until printed. `sweepOrphanFiles()` (run from agent claim, hourly) deletes day-old files no unprinted job needs.

### Job lifecycle (`lib/jobs.ts`)

1. **Draft.** The browser posts the PDF (multipart) to `POST /api/public/jobs`, which validates the PDF, counts pages with pdf-lib, and creates a `draft` job.
2. **Checkout.** `POST /api/public/jobs/[publicId]/checkout` moves the job to one of:
   - `pending_payment` (bKash), which then goes to `queued` via `/api/bkash/callback`;
   - `awaiting_approval` (cash), which goes to `queued` when the owner approves in the dashboard.
3. **Queueing.** `queueJob()` transitions atomically and calls `pickDevice()`. Color jobs need a color device; B/W jobs prefer mono devices, with load-balancing across active jobs.
4. **Re-routing.** `rebalanceQueue()` re-routes queued jobs whose device or agent went offline. An agent counts as online if seen within `AGENT_ONLINE_WINDOW_MS`.
5. **Printing.** The agent claims the job (`printing`), then reports `completed` or `failed`. The PDF is deleted on completion; failed jobs keep the file so they can be reprinted.

### Print agent API (`app/api/agent/*`)

Agents authenticate with a bearer token; only its SHA-256 hash is stored.

- `pair` exchanges a one-time code (created by `createPairingCode` in `app/dashboard/actions.ts`) for a token.
- `heartbeat` upserts the agent's printers. New devices default to `enabled: false`, and enabled devices count against `shop.deviceLimit`.
- `jobs/claim` returns the next job; the agent downloads it from `jobs/[id]/file` with its bearer token.
- `jobs/[id]` reports the result.

The real Windows agent (planned in Go) is not built yet. `scripts/dev-agent.mjs` speaks the same protocol for testing.

### Auth and session

- **Login** is Google OAuth with PKCE, implemented by hand in `lib/google.ts` and `app/api/auth/google/*`.
- **Session** is an HS256 JWT in the `sp_session` cookie, valid for 30 days (`lib/session.ts`).
- **`lib/auth.ts`** provides `getCurrentUser`, `requireUser`, `requireAdmin` and `requireShop`, all deduplicated per request with React `cache`. `requireShop` redirects to `/onboarding` when the owner has no shop yet.

### Payments

- **bKash Tokenized Checkout** lives in `lib/bkash.ts`. Each shop uses its own merchant credentials (password and app secret are AES-256-GCM encrypted with `ENCRYPTION_KEY`), and tokens are cached in memory.
- **The callback is idempotent.** It only acts on `pending_payment` jobs and falls back to a status query when execute fails.
- **Cash** jobs always need owner approval. The dashboard polls via `components/live-refresh.tsx` and chimes when new cash jobs arrive.
- **Billing.** Shops pay `DEVICE_MONTHLY_FEE` per enabled device; new shops start with a `TRIAL_DAYS` trial. The admin extends `paidUntil` manually.

## UI conventions

- **Language.** The whole UI is Bangla; keep new user-facing strings (including error messages from APIs and actions) in Bangla. Payment wording is "ক্যাশ", never "নগদ" (that is a competing payment brand). Button labels like "Save" are English by user preference.
- **Numbers.** Format via `lib/constants.ts` (`formatTaka`, `formatNumber`, `formatToken`, `formatDateTime`), which output Bangla digits.
- **Fonts.** Poppins comes first in the font stack and has no Bangla glyphs, so Bangla falls back to Anek Bangla (`app/layout.tsx`, `--font-sans` in `globals.css`). Text sizes are bumped up site-wide in `@theme`.
- **Theme.** Royal blue primary with a 0.375rem radius; tokens live in `app/globals.css`. Use `IconTile` and `StatCard` (`components/`) with a `tone` prop for color.
- **Components.** Use shadcn/ui only. The style is `base-nova`, built on **Base UI, not Radix**: use `render={<Link/>}` (plus `nativeButton={false}` for non-button elements) instead of `asChild`. `cn` comes from the `cn` package, which merges Tailwind classes.
- **bKash branding.** `components/bkash.tsx` uses `public/images/bkash.png` (full color, so it needs a light background).
- **Responsive.** Every page must work at phone width. Tables hide secondary columns with `hidden md:table-cell` and repeat that info under the primary cell on small screens.

## Environment

Copy `.env.example` to `.env`.

- **Google OAuth.** The redirect URI is `<APP_URL>/api/auth/google/callback` and the JavaScript origin is `<APP_URL>`.
