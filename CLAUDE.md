# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**মুদ্রণ (Mudron).** The brand is "মুদ্রণ" in the Bangla UI and "Mudron" where Windows shows English (agent shortcuts, installed-apps entry, message boxes). The site logo is `public/images/logo.svg` (printing press + name + tagline), shown by `components/logo.tsx`. The press alone (`public/images/logo-small.svg`) is the favicon artwork and the animated landing hero (`components/printing-press.tsx`). The Windows agent keeps its small tile icon (`agent/ui/logo.svg`, `agent/src/icon.rs`). The production site is `https://mudron.org` (self-hosted on a VPS behind Caddy). Since agent 1.3.0 everything is named Mudron, including `Mudron.exe`, the install folder, registry keys and mutexes; agents up to 1.2.0 used "ScanAndPrint" names and `scan-and-print.vercel.app`, and `retire_legacy_install()` in `agent/src/install.rs` moves such an install over when it updates.

Automatic printing for print/photocopy shops in Bangladesh. A customer scans a shop's QR code, uploads a PDF, picks black & white or color and copies, pays with bKash (or cash at the counter), and the job prints automatically on a printer in the shop.

Three roles:

- **Admin**: Google accounts listed in `ADMIN_EMAILS`, at `/dashboard/admin` (inside the same dashboard shell; `/admin` redirects there).
- **Shop owner**: Google login, at `/dashboard`.
- **Customer**: no login. Uses `/s/[slug]` to order and `/j/[publicId]` to watch the order.

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
- **The dashboard sidebar shell renders outside Suspense.** User-specific bits stream into slots (see `app/dashboard/layout.tsx` and `features/dashboard-shell/`). Streaming the whole `<Sidebar>` caused hydration mismatches on mobile.

## Code structure

`app/` holds only route files; each `page.tsx` keeps its metadata and renders one component from `features/<feature>/` (entry `<feature>-page.tsx`, `components/` views, `hooks/use-*.ts` client logic, `actions.ts` server actions, `queries.ts` DB reads). Shared UI is in `components/`, shared hooks in `hooks/`, business logic in `lib/`. Read `features/README.md` before adding a page. Every dashboard table pages 20 rows with a search box via the URL (`lib/list-params.ts`, `TableSearch`, `TablePagination`).

## Architecture

```
Customer browser ──upload PDF──►
Next.js (pages + route handlers + server actions) ◄──HTTPS polling── Print agent on shop PC ──► Windows printers
       │
    MongoDB
```

### Data and services

- **`lib/models.ts`** holds all Mongoose models: User, Shop, Agent (shop PC), Device (printer), Order, PrintJob.
  - An **Order** is what the customer pays for: token, payment, customer, amount. Each uploaded file is one **PrintJob** (`orderId`) with its own color, copies, `pages` (empty = all), `duplex` and `paperSize`; jobs are routed and printed one by one.
  - Shop's `paperSizes.Legal` / `paperSizes.A3` are optional sizes with their own prices; A4 always uses `pricing`.
  - Shop's `pricing`, `paperSizes`, `bkash` and `cash` fields are required subdocuments with defaults, so they're typed as non-optional.
  - Abandoned draft orders and jobs are removed by TTL indexes on `draftExpiresAt`.
  - `scripts/migrate-orders.mjs` (`npm run migrate:orders`) moved pre-2026-11-10 single-file jobs into orders; run it once against any database that has old jobs.
- **`lib/env.ts`** wraps env vars in getters, so missing vars fail at use time, not at build time.
- **`lib/storage.ts`** stores PDFs in MongoDB GridFS (bucket `printFiles`) only until printed. `sweepOrphanFiles()` (run from agent claim, hourly) deletes day-old files no unprinted job needs.

### Job lifecycle (`lib/jobs.ts`)

1. **Draft.** The browser posts each file (multipart) to `POST /api/public/orders`, one at a time. Vercel rejects request bodies over 4.5 MB, so files above `UPLOAD_CHUNK_BYTES` (3.5 MB) are first sent in pieces to `POST /api/public/uploads` (raw body; stored as `UploadPart`, expiring after 2 h) and the final `orders` request passes `upload` + `parts` instead of `file` to join them. The first upload creates a `draft` Order; later ones pass `order` to join it. PDFs are page-counted with pdf-lib; JPG/PNG photos become a one-page A4 PDF (`preparePrintFile` in `lib/pdf.ts`). Word files are not accepted. `DELETE /api/public/orders/[publicId]/files/[fileId]` removes a file before paying. Page previews are drawn in the browser with pdf.js (`features/shop-order/lib/preview.ts`).
2. **Checkout.** `POST /api/public/orders/[publicId]/checkout` takes the options of every file, prices them (`paperPrices()` in `lib/jobs.ts` + `filePrice()` in `lib/constants.ts`: per page on one side, per sheet on both sides, sheet prices default to the one-side price; color both-sides only with `pricing.colorDuplex`) and moves the order to one of:
   - `pending_payment` (bKash), which then goes to `placed` via `/api/bkash/callback?order=…`;
   - `placed` directly (cash). Cash asks for the customer's name and/or mobile number, per the shop's `cash.askName` / `cash.askPhone` switches (`cashFields()` in `lib/jobs.ts`; phone checked with `normalizeBdPhone`); there is no approval step. `awaiting_approval` only exists on old jobs.
3. **Queueing.** `placeOrder()` marks the order placed atomically and calls `queueJob()` for each file, which calls `pickDevice()`. A device must support the job's color, duplex and paper size (`deviceCanPrint`); jobs that pick pages, print both sides or use Legal/A3 only go to agents ≥ `MIN_AGENT_VERSION_FOR_OPTIONS` (1.1.0), because older agents would print every page on A4. B/W jobs prefer mono devices, with load-balancing across active jobs. The order's displayed status is derived from its jobs (`orderStatus()`).
4. **Re-routing.** `rebalanceQueue()` re-routes queued jobs whose device or agent went offline. An agent counts as online if seen within `AGENT_ONLINE_WINDOW_MS`.
5. **Printing.** The agent claims the job (`printing`), then reports `completed` or `failed`. The PDF is deleted on completion; failed jobs keep the file so they can be reprinted.
6. **Expiry.** A file not printed within `QUEUE_EXPIRY_HOURS` (24) of being queued is cancelled with `cancelReason: "expired"` and its PDF deleted (`expireStaleJobs()` in `lib/jobs.ts`, run on agent claim, the customer status page and the dashboard). bKash refunds for these are manual.

### Print agent API (`app/api/agent/*`)

Agents authenticate with a bearer token; only its SHA-256 hash is stored.

- `pair` exchanges a one-time code (created by `createPairingCode` in `features/devices/actions.ts`) for a token.
- `heartbeat` upserts the agent's printers. New devices default to `enabled: false`, and enabled devices count against `shop.deviceLimit`.
- `heartbeat` also takes each printer's supported `paperSizes` (agent 1.1.0+) and `duplexSizes`, the sizes it can print on both sides (agent 1.2.0+; without it only A4 counts as both-sides). `printerDuplexes()` / `printerHasPaper()` in `lib/constants.ts` are used for routing, checkout and the customer page.
- `jobs/claim` returns the next job, including `pages` (SumatraPDF ranges like `"1-3,5"`, or null), `duplex` and `paperSize`; the agent downloads it from `jobs/[id]/file` with its bearer token.
- `jobs/[id]` reports the result.

The real Windows agent is a Rust tray app in `agent/` (see `agent/README.md`; tao + wry + tray-icon, popups are `agent/ui/*.html`). The release exe installs itself per user and runs as a tray app; debug builds (`cargo build`) run in place against `http://localhost:3000`, and `mudron pair <CODE>` / `run [--dry-run --include-virtual]` are console commands for testing. It prints through the SumatraPDF CLI (downloaded from `public/downloads/` on first start, hash pinned in `agent/src/update.rs`). `scripts/dev-agent.mjs` speaks the same protocol for testing.

**Releasing the agent:** bump `version` in `agent/Cargo.toml`, run `powershell -ExecutionPolicy Bypass -File agent/release.ps1` (builds for `https://mudron.org` and writes `public/downloads/Mudron.exe` + `agent.json`), then commit and deploy. Installed agents update themselves within ~6 hours.

### Auth and session

- **Login** is Google OAuth with PKCE, implemented by hand in `lib/google.ts` and `app/api/auth/google/*`.
- **Session** is an HS256 JWT in the `sp_session` cookie, valid for 30 days (`lib/session.ts`).
- **`lib/auth.ts`** provides `getCurrentUser`, `requireUser`, `requireAdmin` and `requireShop`, all deduplicated per request with React `cache`. `requireShop` redirects to `/onboarding` when the owner has no shop yet.

### Payments

- **bKash Tokenized Checkout** lives in `lib/bkash.ts`. Each shop uses its own merchant credentials (password and app secret are AES-256-GCM encrypted with `ENCRYPTION_KEY`), and tokens are cached in memory.
- **The callback is idempotent.** It only acts on `pending_payment` jobs and falls back to a status query when execute fails.
- **Cash** jobs print immediately; the customer gives name and/or phone as the shop's switches ask (`components/cash-checkout.tsx`). The dashboard polls via `components/live-refresh.tsx` and chimes with the customer and amount when a new cash job arrives (`latestCashOrder` in `lib/jobs.ts`).
- **Billing.** Shops pay `DEVICE_MONTHLY_FEE` × device limit per month; new shops start with a `TRIAL_DAYS` trial. Owners pay at `/dashboard/billing` by manual bKash/Nagad Send Money (admin approves in `/dashboard/admin/payments`), our bKash merchant (`/api/billing/bkash/callback`) or EPS (`lib/eps.ts`, `/api/billing/eps/[result]`); the admin can still extend by hand. Methods and their credentials live in the `BillingSettings` document, edited at `/dashboard/admin/payment-setup`. Every `SubscriptionPayment` goes `pending` → `paid` / `failed` / `cancelled` / `rejected`; gateway results are always confirmed with the gateway's status API, and only `markPaid()` (`lib/billing.ts`, idempotent) extends `paidUntil`. "এই মাসের আয়" adds up this month's paid payments (Dhaka time); old records without `status` count as paid. The admin can give a shop a discount (`shop.discount`: % off or a fixed monthly fee, optional end date); always price with `monthlyFee(shop)`, never device limit × fee directly. Multi-month plans get 5% (3 months), 10% (6) or 15% (12) off on top: charge `billingAmount(monthlyFee(shop, devices), months)`. The owner picks the device count when paying, but only from `RENEW_NOTICE_DAYS` (5) before the end date (`canChangeDevices()`; never with a fixed-fee discount); otherwise it stays at `deviceLimit` and the admin adds devices. `markPaid()` sets the new limit from `payment.devices` and switches off extra enabled devices. After `paidUntil` the shop keeps printing for `GRACE_DAYS` (5) (`shopIsOpen` / `serviceEndsAt` in `lib/jobs.ts`); `features/dashboard-shell/components/subscription-banner.tsx` shows the orange (ending) / red (grace, stopped) banner at the top of the dashboard.

## UI conventions

- **Language.** The whole UI is Bangla; keep new user-facing strings (including error messages from APIs and actions) in Bangla. Payment wording is "ক্যাশ", never "নগদ" (that is a competing payment brand). Button labels like "Save" are English by user preference.
- **Numbers.** Format via `lib/constants.ts` (`formatTaka`, `formatNumber`, `formatToken`, `formatDateTime`), which output Bangla digits.
- **Fonts.** Noto Sans Bengali is the only font, for both Bangla and English (`app/layout.tsx`, `--font-sans` in `globals.css`; it is also the Bangla fallback in `--font-mono`). Text sizes are bumped up site-wide in `@theme`.
- **Section pages.** Settings and admin use `PageHeader` + `PageTabs` (`components/page-tabs.tsx`) with full-width cards; put side-by-side cards in a grid (`xl:grid-cols-2`) rather than a narrow column.
- **Main on/off switches.** A section's main switch is `MasterSwitch` (`components/master-switch.tsx`: large, green "চালু" / grey "বন্ধ") in the `CardAction` at the right of the title; other switches stay normal size.
- **Theme.** Royal blue primary with a 0.375rem radius; tokens live in `app/globals.css`. Use `IconTile` and `StatCard` (`components/`) with a `tone` prop for color.
- **Components.** Use shadcn/ui only. The style is `base-nova`, built on **Base UI, not Radix**: use `render={<Link/>}` (plus `nativeButton={false}` for non-button elements) instead of `asChild`. `cn` comes from the `cn` package, which merges Tailwind classes.
- **bKash branding.** `components/bkash.tsx` uses `public/images/bkash.png` (full color, so it needs a light background).
- **Responsive.** Every page must work at phone width. Tables hide secondary columns with `hidden md:table-cell` and repeat that info under the primary cell on small screens.

## Production

`https://mudron.org` runs on a VPS in Docker (`Dockerfile`, Next standalone output, `docker-compose.prod.yml`), behind a Caddy and a MongoDB 8 shared with another site (`deploy/infra`). How to deploy, back up and read logs: `deploy/README.md`. Vercel and MongoDB Atlas were the old production; they are no longer used once agents are on 1.3.0.

**Env read by prerendered pages is baked in at build time** (`APP_URL`, `GOOGLE_ANALYTICS_ID`, `DEVICE_MONTHLY_FEE`, `TRIAL_DAYS`), so they are Docker build args in `docker-compose.prod.yml`; add any new one there too, and rebuild after changing it.

**SEO.** Site texts and keywords are in `lib/seo.ts`; `app/robots.ts`, `app/sitemap.ts`, `app/llms.txt/route.ts`, `app/manifest.ts`, `app/opengraph-image.tsx`, JSON-LD in `app/page.tsx`. New public pages need a canonical (`alternates.canonical`); signed-in pages get `robots: { index: false }` and a `Disallow` in robots.ts. A page that sets its own `openGraph` must list the preview image again.

## Environment

Copy `.env.example` to `.env`.

- **Google OAuth.** The redirect URI is `<APP_URL>/api/auth/google/callback` and the JavaScript origin is `<APP_URL>`.
