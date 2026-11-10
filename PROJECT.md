# Project Tracker — মুদ্রণ (Mudron)

Living document: the goal, the decisions behind the design, what is done, and what comes next.
Update it whenever a feature lands, a decision changes, or a question gets answered.

_Last updated: 2026-11-10_

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
`public/downloads/ScanAndPrintAgent.exe` + `agent.json`. Version 1.0.0 is built for `https://scan-and-print.vercel.app`; 1.1.0 (print options) is coded but not released yet.

- [x] Pairing: `scan-print-agent pair <CODE>`, token saved encrypted with Windows DPAPI
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
- [x] Installer: the downloaded exe installs itself per user (no admin) to `%LOCALAPPDATA%\Programs\ScanAndPrint`,
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
- [x] Both sides (duplex), for B/W and color, same price per printed side; hidden when no enabled printer can duplex
- [x] Paper size A4 / Legal / A3: A4 always on; the owner turns on Legal/A3 with their own prices (Settings → প্রিন্টের দাম).
      Agent 1.1.0 reports each printer's sizes; jobs only go to printers that support them
- [x] Several files in one order (one payment + token), each file with its own color, copies, pages, sides and size.
      New `Order` model; each file is a print job routed on its own. `npm run migrate:orders` moves old jobs
- [x] JPG/PNG upload, converted to a one-page A4 PDF on the server. Word (DOC/DOCX) skipped for now; customers save as PDF.
- [x] Agent 1.1.0 (code): page ranges, duplex and paper size via SumatraPDF `-print-settings`; reports paper sizes.
      Jobs needing these options only go to agents ≥ 1.1.0 (older ones would print every page on A4)
- [ ] Release agent 1.1.0 (`agent/release.ps1` on Windows) and run `npm run migrate:orders` on the production database
- [ ] Test page ranges, duplex and Legal/A3 on a real printer

### 📋 Phase 3: Production launch

- [ ] Choose hosting (VPS) + domain; production Docker Compose (Next.js, MongoDB with auth)
- [ ] Set production `APP_URL`, Google OAuth redirect/origin
- [ ] Switch to bKash live credentials per shop (after each shop's PGW approval)
- [ ] Backups for MongoDB
- [ ] Pilot with 1–3 real shops; test with their actual printers/copiers

### 💡 Backlog / later ideas

- [ ] Shop owners pay our subscription online via our own bKash merchant (today the admin extends it manually)
- [ ] bKash refund for failed or cancelled paid jobs (currently handled manually)
- [ ] WebSocket live updates instead of polling
- [ ] More print options: page range, duplex, paper size
- [ ] Printer health (paper/toner) via SNMP for network printers
- [ ] Reports: daily/monthly income per shop, export
- [ ] Rate limiting on public upload endpoints
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
