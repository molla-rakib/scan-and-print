# Project Tracker — Scan & Print

Living document: the goal, the decisions behind the design, what is done, and what comes next.
Update it whenever a feature lands, a decision changes, or a question gets answered.

_Last updated: 2026-11-05_

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
| Shop owner | Google | Connect PCs/printers, set prices, bKash + cash settings, approve cash orders, print the QR poster |
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
| Print through Windows drivers | Supports essentially every printer/MFP brand. Pure analog copiers (no print port) cannot be supported. |
| Each shop connects **its own bKash merchant (Tokenized Checkout / PGW)** | Money goes straight to the shop. Collecting payments for shops would require a Bangladesh Bank license. |
| **Cash mode** with mandatory owner approval | Shops without PGW access can still operate, and nobody can print for free from home. The owner taps "approve" after taking the money. |
| **Google login only** (no email OTP) | Simplest for owners, and no email infrastructure is needed. |
| Customers do **not** log in | Lowest friction at the counter. A random job link + token number identifies the order. |
| **MongoDB** (replica set), files in **GridFS** | The replica set enables transactions. PDFs are only kept until printed, so GridFS replaces MinIO (one less service; MinIO images are discontinued). |
| Delete files right after printing (+ 1-day storage expiry) | Customers print NIDs and certificates, so privacy matters. |
| **Polling** for live updates (MVP) | Simple and reliable. WebSocket can replace it later if needed. |
| UI fully in **Bangla** | Target users. Anek Bangla font, Poppins for English, Bangla digits, "ক্যাশ" not "নগদ" (competitor brand). |

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
- [x] Cash mode: approval cards in the dashboard with a sound alert
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

Prerequisite: Rust toolchain (already installed on the dev machine). Code lives in `agent/` (see `agent/README.md`).

- [x] Pairing: `scan-print-agent pair <CODE>`, token saved encrypted with Windows DPAPI
- [x] Enumerate installed Windows printers + detect color/duplex capability and state (offline, paper out, …);
      fax / print-to-file printers are not offered
- [x] Heartbeat every ~30 s; poll for jobs every ~3 s; back off and reconnect after internet loss;
      stops with a clear message when the PC is removed in the dashboard
- [x] Download the PDF and print it with B/W or color and copies applied via SumatraPDF CLI; PDF deleted
      from the PC right after *(code done; not yet tested on a real printer)*
- [x] Report completed / failed (Bangla error message shown in the dashboard), retried through short outages
- [ ] Test on a real printer with SumatraPDF next to the agent (B/W, color, copies)
- [ ] Run as a Windows service + system tray icon (status, re-pair, quit)
- [ ] Cash-order popup on the shop PC with an "Approve" button (needs a small agent API addition)
- [ ] Installer (`.exe`) + "Download Print Agent" button in Dashboard → Devices
- [ ] Auto-update from our server
- [ ] Code-signing certificate so Windows does not show the "unknown publisher" warning

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

- [ ] Decide: Windows service, or auto-start app in the user session (a service runs in session 0 and cannot show the tray icon or cash popup itself)
- [ ] Confirm the minimum Windows version for shop PCs (stable Rust and WebView2/Tauri need Windows 10+)
- [ ] bKash sandbox credentials to test payments end-to-end
- [ ] Decide which Google account(s) are admin (`ADMIN_EMAILS` in `.env`)
- [ ] Domain name + hosting choice (Phase 3)
- [ ] Code-signing certificate purchase (before giving the agent to real shops)

---

## 6. Change log

| Date | Change |
|---|---|
| 2026-11-03 | Project idea discussed. Architecture, stack and key decisions agreed. Docker infra + full web MVP built. |
| 2026-11-04 | Switched email OTP → Google login. Full Bangla UI (Anek Bangla). Royal blue theme, more spacing, colorful dashboard, mobile fixes. "ক্যাশ" wording, bKash logo. Session-aware landing/login. Decided to build our own print agent in Go. Exact npm versions (`.npmrc` save-exact). Replaced MinIO with MongoDB GridFS; docker-compose is MongoDB only. |
| 2026-11-05 | Print agent language changed from Go to Rust (dev machine already set up for Rust). Built the core Rust agent (`agent/`): pairing, printer detection, heartbeat/poll loop with reconnect, download + SumatraPDF printing, result reporting. Tested end-to-end in dry-run mode against the local server (pair → heartbeat → claim → download → completed → file deleted; removed PC → agent stops). 1.5 MB release exe. |
