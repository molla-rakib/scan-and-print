# Project Tracker — মুদ্রণ (Mudron)

Living document: the goal, the decisions behind the design, what is done, and what comes next.
Update it whenever a feature lands, a decision changes, or a question gets answered.

_Last updated: 2026-11-12_

---

## 1. Goal

Make printing in Bangladeshi print/photocopy shops automatic.

Today a shop owner receives files by pen drive, email or WhatsApp, opens them, prints by hand and collects
money. We replace that with:

> Customer scans the shop's QR code → uploads a PDF → picks B/W or color + copies → pays (bKash or cash)
> → the job prints automatically on the right machine → customer collects pages with a token number.

**Business model:** shop owners pay **৳300 per enabled device per month** (printer or photocopy machine).
New shops get a free trial (`TRIAL_DAYS`, default 14 days, `TRIAL_DEVICE_LIMIT` devices).
Customer payments go **directly to the shop's own bKash merchant account**, never through us.

### Roles

| Role | How they sign in | What they do |
|---|---|---|
| Admin (us) | Google, email listed in `ADMIN_EMAILS` | Manage shops, device limits, subscriptions, suspend shops |
| Shop owner | Google | Connect PCs/printers, set prices, bKash + cash settings, collect cash at the counter, print the QR poster |
| Customer | No login | Upload, pay, follow the job live |

---

## 2. How the whole system works

```
Customer phone ──upload──► Next.js ──► MongoDB GridFS (temporary file storage)
      │                        ▲ download
      ▼                        │
Website + API (Next.js) ◄── polls ── Print Agent (Windows app on shop PC) ──► Printers / copiers
      │
   MongoDB
```

The system has two pieces of software, both built by us:

1. **Website and API.** The customer pages, owner dashboard, admin panel and the API the agent uses. *(Built.)*
2. **Print agent.** A small Windows program on the shop's PC. It reports the installed printers, picks up
   paid jobs, prints them through the normal Windows printer drivers, and reports the result. *(Core built
   in Rust in `agent/`; tray, installer and auto-update still to do. `scripts/dev-agent.mjs` is a fake
   version for testing.)*

Why an agent is needed: a website cannot reach a printer inside a shop. The agent runs next to the printers
and connects out to our server. Because it prints through Windows drivers, any printer or digital copier
that Windows can print to will work.

---

## 3. Key decisions (and why)

| Decision | Why |
|---|---|
| Build our own print agent (not PrintNode etc.) | Full control (pairing, cash-approval popups, branding). No per-printer fee eating into the ৳300/device. The server API already exists. |
| Agent in **Rust** (switched from Go on 2026-11-05) | The dev machine is already set up for Rust. Single small `.exe` (~2–5 MB), Microsoft's official `windows` crate for the printer APIs, fewer antivirus false positives than Go binaries, and the Bangla cash popup can be built with Tauri. Can still target Linux/Raspberry Pi later. |
| Agent is an **auto-start tray app** in the user's session, not a Windows service (decided 2026-11-06) | One program that can show the tray icon and cash popup itself and prints to printers installed for that user. Trade-off: it only runs while someone is logged in. |
| Shop PCs need **Windows 10 or newer** (decided 2026-11-06) | Current Rust and WebView2 support it out of the box; the popup is HTML (tao + wry + tray-icon, the libraries under Tauri) so Bangla renders like the website. |
| Print through Windows drivers | Supports essentially every printer/MFP brand. Pure analog copiers (no print port) cannot be supported. |
| Each shop connects **its own bKash merchant (Tokenized Checkout / PGW)** | Money goes straight to the shop. Collecting payments for shops would require a Bangladesh Bank license. |
| **Cash orders print immediately**; name + mobile number required (changed 2026-11-07, was mandatory owner approval) | Approving every cash order annoyed shop owners. Shops without PGW access can still operate. Trade-off: someone could order from home without paying; the required name and phone make every cash job traceable, and the dashboard chimes with who owes how much. |
| **Google login only** (no email OTP) | Simplest for owners, and no email infrastructure is needed. |
| Customers do **not** log in | Lowest friction at the counter. A random job link + token number identifies the order. |
| **MongoDB** (replica set), files in **GridFS** | The replica set enables transactions. PDFs are only kept until printed, so GridFS replaces MinIO (one less service; MinIO images are discontinued). |
| Delete files right after printing (+ 1-day storage expiry) | Customers print NIDs and certificates, so privacy matters. |
| **Polling** for live updates (MVP) | Simple and reliable. WebSocket can replace it later if needed. |
| UI fully in **Bangla** | Target users. Noto Sans Bengali font for everything, Bangla digits, "ক্যাশ" not "নগদ" (competitor brand). |

---

## 4. Status

### ✅ Done: Phase 1, web platform MVP (2026-11-03 → 11-04)

- [x] Docker Compose: MongoDB replica set only (PDFs in GridFS, swept after 1 day)
- [x] Google OAuth login (PKCE), 30-day session, session-aware landing page and `/login` redirect
- [x] Landing page: hero, how it works, features, requirements, pricing, FAQ, mobile menu
- [x] Shop onboarding (name, link/slug, address, phone)
- [x] Customer flow `/s/[slug]`: direct-to-storage PDF upload with progress, page counting, B/W/color, copies, live price
- [x] Job status page `/j/[id]`: token, live status (queue position → printing → done), retry payment
- [x] bKash Tokenized Checkout per shop: encrypted credentials, verified on save, callback + execute + status fallback
- [x] Cash mode: prints right away with the customer's name + phone (approval removed 2026-11-07); dashboard chimes on new cash orders
- [x] Automatic printer routing (color vs B/W, least busy, re-route when a PC goes offline)
- [x] Agent API: pair, heartbeat, claim job, report result
- [x] Owner dashboard: overview stats + setup checklist, orders (approve/cancel/reprint/mark done), devices
      (pair PC, enable/disable, rename, color/B&W), settings (profile, prices, cash, bKash), printable QR poster
- [x] Device-based licensing (enabled devices ≤ shop's device limit) and trial period
- [x] Admin panel: all shops, extend subscription, device limit, suspend/activate
- [x] Dev agent script (`npm run dev:agent`) for end-to-end testing without a printer
- [x] Royal blue theme, colorful dashboard, fully responsive on mobile
- [x] Tested end-to-end: upload → cash → approve → routed to color printer → printed → file deleted

### 🔜 Next: Phase 2, Windows print agent (Rust)

Code lives in `agent/` (see `agent/README.md`). Release with `agent/release.ps1`, which publishes
`public/downloads/Mudron.exe` + `agent.json`. Since 1.3.0 it is built for `https://mudron.org` (1.0.0–1.2.0 were
`ScanAndPrintAgent.exe` for `https://scan-and-print.vercel.app`).

- [x] Pairing: `mudron pair <CODE>`, token saved encrypted with Windows DPAPI
- [x] Enumerate installed Windows printers + detect color/duplex capability and state (offline, paper out, …);
      fax / print-to-file printers are not offered
- [x] Heartbeat every ~30 s; poll for jobs every ~3 s; back off and reconnect after internet loss;
      stops with a clear message when the PC is removed in the dashboard
- [x] Download the PDF and print it with B/W or color and copies applied via SumatraPDF CLI; PDF deleted
      from the PC right after *(code done; not yet tested on a real printer)*
- [x] Report completed / failed (Bangla error message shown in the dashboard), retried through short outages
- [ ] Test on a real printer with SumatraPDF next to the agent (B/W, color, copies)
- [x] Tray app that starts with Windows (HKCU Run key, turned on at first pairing, toggle in the menu): status
      icon + menu (online/offline, printers, cash orders, open dashboard, re-pair, log file, quit), first-run
      pairing window, single instance; clicking the shortcut while running brings it forward. Release builds
      have no console window. *(Tested on the dev PC)*
- [x] Status window on the shop PC (tray click / shortcut): online state, shop, printers, last job, version.
      (Replaced the cash-approval popup, removed 2026-11-07 because cash orders no longer need approval.)
- [x] Installer: the downloaded exe installs itself per user (no admin) to `%LOCALAPPDATA%\Programs\Mudron`,
      Start Menu + desktop shortcuts, Settings → Apps entry with uninstall (removes everything incl. saved token).
      "এজেন্ট ডাউনলোড" button + link in the pairing dialog on Dashboard → ডিভাইস. *(Tested install/uninstall)*
- [x] SumatraPDF served from `public/downloads/` and downloaded by the agent on first start (SHA-256 pinned)
- [x] Auto-update: checks `/downloads/agent.json` 2 min after start then every 6 h, verifies SHA-256, finishes
      the current job, replaces itself and restarts. *(Tested 1.0.0 → 1.0.1)*
- [x] App icon + version info embedded in the exe
- [ ] Code-signing certificate so Windows does not show the "unknown publisher" warning

### 🔜 Phase 2.5: More print options + settings redesign (agreed 2026-11-10)

- [x] Settings split into sections with their own menu: দোকানের তথ্য, প্রিন্টের দাম, পেমেন্ট
      (`/dashboard/settings`, `/pricing`, `/payment`; scrollable tabs on phones)
- [x] Cash: owner switches for asking the customer's name and/or mobile number (shown = required; at least one on)
- [x] Page selection: page previews with a checkbox on each (plus all/none and typed ranges like "১-৩, ৫"); price counts selected pages only
- [x] Both sides (duplex), priced per sheet (2 pages = 1 sheet, odd last page = full sheet); the owner sets the sheet price per size (default = one-side price). Color is one side only unless the owner turns on color both sides; hidden when no enabled printer can duplex
- [x] Paper size A4 / Legal / A3: A4 always on; the owner turns on Legal/A3 with their own prices (Settings → প্রিন্টের দাম).
      Agent 1.1.0 reports each printer's sizes; jobs only go to printers that support them
- [x] Several files in one order (one payment + token), each file with its own color, copies, pages, sides and size.
      New `Order` model; each file is a print job routed on its own. `npm run migrate:orders` moves old jobs
- [x] JPG/PNG upload, converted to a one-page A4 PDF on the server. Word (DOC/DOCX) skipped for now; customers save as PDF.
- [x] Agent 1.1.0 (code): page ranges, duplex and paper size via SumatraPDF `-print-settings`; reports paper sizes.
      Jobs needing these options only go to agents ≥ 1.1.0 (older ones would print every page on A4)
- [ ] Release agent 1.1.0 (`agent/release.ps1` on Windows) and run `npm run migrate:orders` on the production database
- [ ] Test page ranges, duplex and Legal/A3 on a real printer
- [ ] Release agent 1.2.0 (Legal/A3 both-sides fix) with `agent/release.ps1`; confirm with the shop that reported it

### 📋 Phase 2.6: Shops pay their subscription online (planned 2026-11-11)

Today the admin extends `paidUntil` by hand. Owners will pay from **Dashboard → বিল** with any method the admin
has turned on. Follow each provider's official API guide; no extra abstraction beyond what three methods need.

**One flow for every method** (`SubscriptionPayment`, extended with `method`, `status`, `months`, `trxId`,
`gatewayRef`, `submittedBy`):

```
pending ──► paid       (only this extends paidUntil and counts in "এই মাসের আয়")
        ├─► failed
        └─► cancelled / rejected
```

- Gateways (bKash, EPS): create payment → owner redirected → callback → **verify with the gateway's status API**
  before marking paid. Callbacks are idempotent (only act on `pending`), like the shop bKash callback.
- Manual: owner sends money to our number and submits TrxID + sender number + amount → admin approves or rejects.

Tasks:

- [x] Owner billing page `/dashboard/billing` (sidebar "বিল ও পেমেন্ট"): paid until, device limit × fee, pick months
      (1/3/6/12), method, history; reminder banner on the overview ~5 days before expiry
- [x] Admin → পেমেন্ট সেটআপ (`/dashboard/admin/payment-setup`): turn each method on/off; our bKash / Nagad numbers for
      manual payments; bKash and EPS merchant credentials (encrypted with `ENCRYPTION_KEY`, verified on save)
- [x] Manual bKash / Nagad payment + admin approval queue (Admin → পেমেন্ট, with a pending count on the tab)
- [x] bKash Tokenized Checkout with our own merchant account (reuse `lib/bkash.ts`) *(code done; untested until we have credentials)*
- [x] EPS gateway (https://eps.com.bd/): `lib/eps.ts` (GetToken → InitializeEPS → CheckMerchantTransactionStatus,
      `x-hash` = Base64 HMAC-SHA512). *(Code done from EPS's published flow; untested until we have sandbox credentials —
      check field names against EPS's official guide when the account arrives)*
- [ ] Test bKash and EPS with sandbox credentials, then switch them to live
- [ ] Manual "মেয়াদ বাড়ান" stays for special cases
- Wording: label Nagad as "নগদ (Nagad)" so it isn't confused with cash ("ক্যাশ")

Waiting on the owner: our bKash PGW merchant approval, EPS merchant account, our bKash/Nagad receiving numbers.

### 📋 Phase 3: Production launch

- [ ] Choose hosting (VPS) + domain; production Docker Compose (Next.js, MongoDB with auth)
- [ ] Set production `APP_URL`, Google OAuth redirect/origin
- [ ] Switch to bKash live credentials per shop (after each shop's PGW approval)
- [ ] Backups for MongoDB
- [ ] Pilot with 1–3 real shops; test with their actual printers/copiers

### 🎯 Maturity: 6.5 / 10 today, goal 9+ (reviewed 2026-11-11)

Solid code and features; not production-hardened yet. Fix gradually, re-score after each step.

| Area | Score | Why |
|---|---|---|
| Code quality & structure | 8 | Clean, typed, consistent; docs and tracker kept current; hard logic centralized (routing, pricing, `markPaid`) |
| Features | 8 | Full flow: upload → pay → route → print, multi-file, print options, billing, discounts, admin |
| Security | 7 | Encrypted secrets, hashed agent tokens, idempotent callbacks, gateway-verified payments. Missing rate limiting and a signed agent |
| Performance (current scale) | 7 | Fine for tens of shops; each agent poll (every 3 s) runs re-routing + expiry + claim queries, heavy at hundreds |
| Reliability & testing | 4 | No automated tests; never run on a real printer; bKash/EPS untested |
| Operations | 4 | No backups, no monitoring/alerts, errors only in `console.error` |

To reach 9+ (in order):

- [ ] Test on a real shop PC + printer: B/W, color, copies, pages, both sides, Legal/A3 (biggest risk) → pilot-ready
- [ ] MongoDB backups (excluding `printFiles.*`) + error monitoring and alerts (e.g. Sentry)
- [ ] Automated tests for money and routing: `filePrice`, `monthlyFee`/discounts, `markPaid`, `deviceCanPrint`, job expiry
- [ ] Rate limiting on public upload/order endpoints
- [ ] Lighter agent polling: run `rebalanceQueue` / `expireStaleJobs` on a timer instead of on every claim
- [ ] Code-signing certificate for the agent
- [ ] Test bKash and EPS with sandbox credentials
- [ ] Health checks + structured logging on the VPS; documented restore from backup

### 💡 Backlog / later ideas

- [ ] ~~Shop owners pay our subscription online~~ → planned as Phase 2.6
- [ ] bKash refund for failed or cancelled paid jobs (currently handled manually)
- [ ] WebSocket live updates instead of polling
- [ ] More print options: page range, duplex, paper size
- [ ] Printer health (paper/toner) via SNMP for network printers
- [ ] Reports: daily/monthly income per shop, export
- [ ] Raspberry Pi / Linux agent (CUPS) for shops without a Windows PC

---

## 5. Open items waiting on the owner

- [ ] bKash sandbox credentials to test payments end-to-end
- [ ] Decide which Google account(s) are admin (`ADMIN_EMAILS` in `.env`)
- [ ] Domain name + hosting choice (Phase 3)
- [ ] Code-signing certificate purchase (before giving the agent to real shops; until then SmartScreen shows
      "Windows protected your PC" → More info → Run anyway)
- [ ] Test the agent on a real shop PC + printer (B/W, color, copies)

---

## 6. Change log

| Date | Change |
|---|---|
| 2026-11-03 | Project idea discussed. Architecture, stack and key decisions agreed. Docker infra + full web MVP built. |
| 2026-11-04 | Switched email OTP → Google login. Full Bangla UI (Anek Bangla). Royal blue theme, more spacing, colorful dashboard, mobile fixes. "ক্যাশ" wording, bKash logo. Session-aware landing/login. Decided to build our own print agent in Go. Exact npm versions (`.npmrc` save-exact). Replaced MinIO with MongoDB GridFS; docker-compose is MongoDB only. |
| 2026-11-05 | Print agent language changed from Go to Rust (dev machine already set up for Rust). Built the core Rust agent (`agent/`): pairing, printer detection, heartbeat/poll loop with reconnect, download + SumatraPDF printing, result reporting. Tested end-to-end in dry-run mode against the local server (pair → heartbeat → claim → download → completed → file deleted; removed PC → agent stops). 1.5 MB release exe. |
| 2026-11-06 | Decided: auto-start tray app, Windows 10+. Built the tray app (status icon + menu, pairing window, start with Windows, log file) and the cash-approval popup, plus the agent approvals API on the server. Release exe 1.9 MB. |
| 2026-11-07 | Landing page redesigned with a print-shop identity (CMYK accents, paper texture, live-queue ticker, before/after, bento features, receipt-style pricing; hero shows a printer feeding out the order slip with token, QR poster and cash-alert note). Admin panel moved into the dashboard at `/dashboard/admin` (`/admin` redirects; sidebar works for admins without a shop). Fixed the sidebar profile menu crash (Base UI `GroupLabel` outside `Group`) and added Settings/Admin links to it. Font switched to Noto Sans Bengali site-wide. |
| 2026-11-07 | Print agent 1.0.0 finished: self-installing per-user exe with shortcuts and uninstall, auto-update via `/downloads/agent.json`, SumatraPDF downloaded on first start, embedded icon, production server `https://scan-and-print.vercel.app` built in, `agent/release.ps1`. Dashboard → ডিভাইস has an "এজেন্ট ডাউনলোড" button. Tested on the dev PC against a local server: install, pairing window, cash popup + approve, auto-update 1.0.0 → 1.0.1, uninstall. Not yet tested on a real printer. |
| 2026-11-07 | **Cash orders no longer need approval**: the customer enters name + mobile number (validated; Bangla digits and +88 accepted) and the job is queued immediately. Removed the approval cards, sidebar badge, agent popup and `/api/agent/approvals`; old `awaiting_approval` jobs can still be printed or cancelled from the order menu. Dashboard shows the customer on cash orders, chimes with who owes how much, and the overview shows today's cash to collect. The pairing dialog now shows the PC connecting live (waiting → connected → printers found). Agent: status window instead of the popup, redesigned pairing window, SumatraPDF download retried every minute. |
| 2026-11-10 | Local MongoDB volume reset (old data was FCV 7.0, which mongo 8.2 cannot open). Agreed the next feature set (Phase 2.5): page selection with previews, duplex, paper sizes, multiple files per order, images; Word skipped. Settings page redesigned into sections with a side menu; cash orders ask for name and/or phone per the owner's switches. |
| 2026-11-10 | **Phase 2.5 done.** Orders can hold up to 20 files (PDF, JPG, PNG), each with its own pages (picked on page previews), color, both sides, paper size (A4/Legal/A3) and copies; one token and one payment. New `Order` model (payment, customer, token) with print jobs per file; public API moved to `/api/public/orders`. Settings → প্রিন্টের দাম has Legal/A3 switches and prices. Agent 1.1.0 prints page ranges, duplex and paper size and reports printers' paper sizes; such jobs never go to older agents. Tested end-to-end with the dev agent (two files in one order, pages 1,3-5 duplex Legal → duplex printer, photo → color printer, ৳42 total). |
| 2026-11-10 | Admin income fixed: "মাসিক আয় (সক্রিয়)" estimated devices × fee for every open shop (trials included). Now "মেয়াদ বাড়ান" also asks for the amount received (pre-filled from devices × fee × months), stored as a `SubscriptionPayment`, and "এই মাসের আয়" adds up only this month's real payments. Settings text trimmed to titles; price inputs larger with "টাকা". |
| 2026-11-10 | Customer print screen polished (filled selected options, prominent page-picker button, per-file price box, numbered steps, sticky total bar; separate PDF and photo pickers because Android's photo picker hid PDFs). QR page renamed "QR ও লিংক" with a share card: copy link, native Share, WhatsApp. |
| 2026-11-10 | Large uploads fixed for Vercel (4.5 MB request body limit): files over 3.5 MB are sent in pieces to `/api/public/uploads` and joined server-side, with per-piece retries; PDFs still stay in our own MongoDB. Tested with a 10 MB PDF (3 pieces). Order history: delete one finished order or all completed/cancelled orders. QR page: share/open link buttons in the header. Status page: per-stage animations and a step tracker. |
| 2026-11-10 | Rebranded to **মুদ্রণ (Mudron)**: logo mark from `agent/ui/logo.svg` in the site header/sidebar/login, page titles, footer, README; agent shows "Mudron" in Windows (shortcut, installed apps, tray, dialogs) and মুদ্রণ in its windows. Internal names (exe, install folder, registry, domain) unchanged so installed agents keep updating. |
| 2026-11-10 | Logo is now the printing-press illustration (`public/images/logo-small.svg`) in the navbar, sidebar and footers. Landing hero shows it animated (`components/printing-press.tsx`: gears and rollers turn, a printed sheet feeds out, lights blink; CSS only, off for reduced motion). |
| 2026-11-10 | Nav/site logo switched back to the main mark `agent/ui/logo.svg` (blue tile + sheet); the printing press stays as the animated hero. |
| 2026-11-10 | Site logo is now the full wordmark `public/images/logo.svg` (press + মুদ্রণ + tagline) everywhere `Logo` is used. |
| 2026-11-10 | Photo uploads failed on Vercel (PNG → PDF conversion in JS was too slow for the function). Photos are now re-saved in the browser as JPEG (92%, max 3508 px, white background, phone rotation applied; PNGs under 1 MB stay lossless), and the upload route has `maxDuration = 60`. A 62 MB PNG now uploads as a 1.7 MB file. |
| 2026-11-10 | Local MongoDB kept restarting (exit 62): the volume had been opened once with `mongo:8` (now 8.3), which raised its featureCompatibilityVersion to 8.3, so the pinned `mongo:8.2` refused to start. `docker-compose.yml` now pins `mongo:8.3`; data kept. |
| 2026-11-10 | **Both-sides pricing per sheet.** Duplex jobs are charged per sheet (30 pages = 15 sheets; 31 pages = 16), with a separate per-sheet price per paper size in Settings (defaults to the one-side price). Color printing is one side only by default; a switch in Settings turns on color both-sides with its own sheet price, and it also needs a printer that is both color and duplex. Tested via the API against the local DB (৳90 → ৳45, ৳2.5/sheet → ৳37.5, color 31 pages at ৳15/sheet → ৳240). |
| 2026-11-11 | **Fixed: both sides on Legal/A3 didn't work.** (1) Agent 1.1.0 sent `paper=legal`/`paper=A3` to SumatraPDF 3.6.1, which only matches a driver's paper whose name is exactly that ("Legal 8.5 x 14" doesn't match), so it silently kept another paper and duplex got lost. Agent 1.2.0 sends `paperkind=<DMPAPER id>`. (2) Printers reported one duplex flag for all sizes, and the customer page offered both sides and Legal/A3 separately, so a job could need a printer that doesn't exist. Agent 1.2.0 asks the driver per size (`DocumentProperties` validation) and reports `duplexSizes`; the server routes, prices and offers both sides per paper size (`printerDuplexes()` in `lib/constants.ts`). Legal/A3 both sides stay hidden until the shop's agent is 1.2.0. |
| 2026-11-11 | Admin shop table shows every column on phones (scrolls sideways). **Orders expire after 24 hours:** a file not printed within 24 h of being placed is cancelled and its PDF deleted, so a PC switched on days later doesn't print stale orders and storage isn't wasted; the customer's status page says why (and to ask the shop for a bKash refund). The "printer offline" notice on the order page now mentions the 24-hour limit. |
| 2026-11-11 | Planned Phase 2.6: owners pay the subscription online (manual bKash/Nagad with admin approval, bKash merchant, EPS), all configured from Admin → পেমেন্ট সেটআপ and sharing one pending → paid/failed/rejected flow. |
| 2026-11-11 | **Phase 2.6 built.** Owners pay the subscription from "বিল ও পেমেন্ট": manual bKash/Nagad Send Money (TrxID + sender, admin approves/rejects in Admin → পেমেন্ট), bKash merchant and EPS (redirect, then verified with the gateway's status API). All three are configured and switched on/off in Admin → পেমেন্ট সেটআপ, no code changes needed when the merchant accounts arrive. One flow: `SubscriptionPayment` pending → paid/failed/cancelled/rejected; only paid extends `paidUntil` (`markPaid()` in `lib/billing.ts`, idempotent) and counts as income. Main on/off switches are now a larger green "চালু / বন্ধ" switch at the right of each section title (`components/master-switch.tsx`), also on the shop's cash and bKash settings. |
| 2026-11-11 | **Subscription discounts:** Admin → দোকান → menu → ছাড় gives a shop a % off or a fixed monthly fee, with an optional end date and a note. `monthlyFee()` in `lib/billing.ts` applies it everywhere (billing page with the full price struck through, gateway and manual payments, the admin's suggested amount, overview). The admin shop table has a মাসিক ফি column. **Settings redesigned** to match the admin pages: header + underlined tabs (`components/page-tabs.tsx`, shared with admin), full cards and wider layouts (profile in two columns, A4/Legal/A3 prices side by side, cash and bKash side by side) instead of a narrow column with empty space. |
| 2026-11-12 | **Renamed everything to Mudron; production moves to `https://mudron.org`** (self-hosted VPS, Caddy, MongoDB shared with another app in its own container). Agent 1.3.0 is `Mudron.exe` (CLI `mudron`), installs to `%LOCALAPPDATA%\Programs\Mudron`, data in `%APPDATA%\Mudron`, registry/mutex names `Mudron`, env vars `MUDRON_SERVER` / `MUDRON_SUMATRA`. Installing it over a ≤ 1.2.0 "ScanAndPrint" agent stops the old one, takes over its pairing (server switched to mudron.org) and removes the old files and registry entries. npm package, compose project and local DB name are `mudron`. **Deployed to mudron.org:** Docker image (`Dockerfile`, standalone output), shared `/var/www/infra` stack (Caddy + MongoDB 8 with a user per app) also serving eshopbd.site, Atlas data copied into the `mudron` database, agency-os demo removed. See `deploy/README.md`. |
| 2026-11-12 | **SEO and AI discoverability:** `robots.txt` (`app/robots.ts`: public pages open to search and AI crawlers such as GPTBot, ClaudeBot, PerplexityBot, Google-Extended; dashboard, login, onboarding, API and order pages closed), `sitemap.xml` (home, llms.txt and every active shop page, read per request), `llms.txt` (plain English + Bangla description, how it works, pricing, FAQ), `manifest.webmanifest`, a 1200×630 link-preview image (`app/opengraph-image.tsx`), site-wide title/description/keywords/Open Graph/Twitter tags (`lib/seo.ts`), canonical URLs per page, schema.org JSON-LD on the home page (Organization, WebSite, SoftwareApplication with price, FAQPage), shop pages with their own description and preview, noindex on signed-in pages. `APP_URL`, `DEVICE_MONTHLY_FEE` and `TRIAL_DAYS` are now Docker build args too, since prerendered pages bake them in. |
| 2026-11-12 | Google Tag Manager on every page via `@next/third-parties` in `app/layout.tsx`, production builds only. The container ID comes from `GOOGLE_ANALYTICS_ID` (`GTM-KSQJDV95`), baked in at build time (Docker build arg); the production compose file moved to `docker-compose.prod.yml` in the repo root so Compose reads `.env` for it. |
| 2026-11-12 | Public **install guide** `/guide` (6 steps with the দোকান ড্যাশবোর্ড → ডিভাইস → এজেন্ট ডাউনলোড screenshot `public/images/guide/download-agent.png`, tray icon colors, troubleshooting, update/uninstall), **support** `/support`, **terms** `/terms` and **privacy** `/privacy` pages. WhatsApp support number +880 1521-505130 (`SUPPORT_WHATSAPP` in `lib/constants.ts`) on these pages and in the footer. Site header/footer shared (`components/site-header.tsx`, `site-footer.tsx`, `content-page.tsx`); nav gains "ইনস্টল গাইড" and collapses to the menu below `lg`. New pages in sitemap and llms.txt. |
| 2026-11-12 | Subscription plan discounts: 3 months 5%, 6 months 10%, 12 months 15% off (`BILLING_MONTH_DISCOUNTS` / `billingAmount()` in `lib/constants.ts`, applied on top of the shop's `monthlyFee(shop)` in the pay form and in both billing actions). WhatsApp number shown in English digits. |
| 2026-11-12 | **Devices chosen at payment + grace period.** The pay form has a device stepper (1–20); the count can only change from 5 days before the end date (otherwise owners contact us on WhatsApp and the admin raises the limit), not with a fixed-fee discount. The payment stores `devices`; when paid the shop's limit becomes that and extra enabled printers are switched off. Dashboard-wide banner: orange "N days left" in the last 5 days, red "N days left, then printing stops" during 5 free grace days after the end date, red "printing stopped" after. Orders are accepted until end date + 5 days. Admin payment list shows the device count. |
| 2026-11-12 | **Billing hardening (production).** `extendShop` is one atomic update (two payments settled at once both count; before, one could be lost). `markPaid` extends and sets the device limit in that same update, and puts the payment back to pending if that fails. The bKash subscription callback no longer marks a payment "failed" when bKash took the money but our database write failed (it stays pending for the admin). Owner payments send the amount shown and are refused if the server price differs. A payment carries a device count only when chosen in the renewal window. Extra printers are switched off keeping connected and oldest first, and their queued jobs are re-routed. Dev: models rebuild on hot reload (a stale model silently dropped the new `devices` field). Outside the renewal window the pay form shows a countdown ("ফ্রি ট্রায়ালের / মেয়াদ শেষ হতে আর N দিন বাকি"). Verified with 48 scripted checks against MongoDB and an end-to-end manual bKash payment in the browser (submit → approve → limit 2→1, one printer off, extended from the old end date). |
| 2026-11-12 | Onboarding asks how many printers/copiers the shop will connect (stepper 1–20, pre-set from `TRIAL_DEVICE_LIMIT`) and shows live plan prices for that count: 1 month, 3/6/12 months with 5/10/15% off (`components/plan-pricing.tsx`), plus "first N days free". The trial starts with that device limit. Tested in the browser: 3 devices → ৳900/month, 12 months ৳9,180, shop created with limit 3. |
| 2026-11-12 | Admin can **delete a shop permanently** (shop menu → দোকান মুছে ফেলুন, besides the reversible "দোকান বন্ধ করুন"). Red warning listing what is lost; the button stays disabled until the admin types the shop's link, also checked on the server (`deleteShop` in `app/dashboard/admin/actions.ts`). Deletes stored PDFs, print jobs, orders, upload pieces, printers, computers and subscription payments, then the shop last (a half-finished delete can be re-run); the owner's login stays. Tested in the browser: everything for the shop gone, including the GridFS file; other shops untouched. |
| 2026-11-12 | **Codebase restructured, no feature changes:** every page's code moved to `features/<feature>/` (page entry, view components, `hooks/` for client logic, `actions.ts`, `queries.ts`); `app/` keeps only thin route files (see `features/README.md`). `app/dashboard/actions.ts` split per feature. **Search + pagination (20 rows) on every dashboard table:** admin shops (name, phone, link, owner email), admin pending + history payments, print orders (token incl. Bangla digits, name, phone), billing history (TrxID, sender). **Smoother feel:** top progress bar on every link navigation; `useAction` keeps buttons pending until the next page is shown; onboarding shows "তৈরি হচ্ছে… / ড্যাশবোর্ড খোলা হচ্ছে…" and prefetches the dashboard. The 8–10 s after onboarding was the dev server compiling `/dashboard` the first time; the production build renders it in 0.2–0.6 s. Verified: tsc, lint, build, every page signed in (owner + admin) against a seeded local DB, search/paging in the browser. |
| 2026-11-11 | Maturity review: **6.5/10** (code 8, features 8, security 7, performance 7, reliability/testing 4, operations 4). Goal 9+; the steps to get there are listed under "🎯 Maturity" in section 4. |
