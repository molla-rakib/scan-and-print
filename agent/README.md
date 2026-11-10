# Mudron (মুদ্রণ) agent (Rust)

The Windows program that runs on the shop's PC. It reports the installed printers to the server, picks up
paid jobs, prints them, and updates itself. It speaks the same API as
`scripts/dev-agent.mjs` (`app/api/agent/*`). Requires Windows 10 or newer with WebView2 (built into
Windows 11 and updated Windows 10).

## For the shop owner

1. Dashboard → ডিভাইস → **এজেন্ট ডাউনলোড** (`/downloads/ScanAndPrintAgent.exe`).
2. Run it. Until the exe is code-signed, Windows SmartScreen warns: **More info → Run anyway**.
   It installs itself for the current Windows user (no admin prompt) to
   `%LOCALAPPDATA%\Programs\ScanAndPrint`, adds Start Menu + desktop shortcuts and an entry in
   Settings → Apps, then starts.
3. A window asks for the pairing code (Dashboard → ডিভাইস → কম্পিউটার যুক্ত করুন). After pairing the
   agent starts with Windows and downloads SumatraPDF (20 MB, once).
4. Enable the printers in the dashboard.

From then on it lives in the tray: a blue icon with a green (online), red (offline / not paired) or
orange (print software missing) dot. Clicking it, or the desktop shortcut, opens a status window: online state,
shop, printers, last job.
Uninstall from Settings → Apps → "Mudron Agent". The exe file, install folder (`%LOCALAPPDATA%\Programs\ScanAndPrint`), registry keys and download URL keep their pre-rename names so installed agents keep updating.

## Releasing a new version

```powershell
# 1. bump `version` in agent/Cargo.toml
powershell -ExecutionPolicy Bypass -File agent/release.ps1   # builds, copies to public/downloads, writes agent.json
# 2. commit public/downloads and deploy
```

Installed agents check `/downloads/agent.json` 2 minutes after start and then every 6 hours. A newer
version is downloaded, its SHA-256 checked, the current job finished, and the new exe installs itself
and restarts. `release.ps1 -Server <url>` builds for another server (the default is
`https://scan-and-print.vercel.app`).

## Development

```bash
cd agent
cargo build                # debug build: runs in place, no self-install, default server http://localhost:3000
cargo test
```

Debug builds keep a console. Useful commands (release builds print to the terminal they're started from):

```bash
scan-print-agent                     # tray app
scan-print-agent pair <CODE> [--server http://localhost:3000]
scan-print-agent run [--dry-run] [--include-virtual]   # console mode instead of the tray
scan-print-agent printers            # what Windows has installed, with color/duplex/state
scan-print-agent status | unpair
scan-print-agent autostart on|off
scan-print-agent install | uninstall
scan-print-agent ui-preview pair|pair-error|pair-done|status|status-setup|status-offline   # debug builds: open a window with sample data
```

The windows are HTML in `ui/` (`style.css` is shared, `logo.svg` is inserted at `<!--LOGO-->`); use
`ui-preview` to check a change without pairing or placing orders.

`--include-virtual` also offers fax and "print to file" printers (such as Microsoft Print to PDF) to the
server. Use it with `--dry-run` to test on a PC without a real printer. `SCAN_PRINT_SERVER` overrides the
server used for pairing (also for the installed app, if set when the installer runs).

## How it works

| File | What it does |
|---|---|
| `src/main.rs` | No arguments: self-install (release, when not yet installed) or the tray app. Otherwise a console command |
| `src/gui.rs` | Tray app (tao event loop + tray-icon): status icon and menu, pairing and status windows (wry web views showing `ui/*.html`), SumatraPDF download, update checks |
| `src/runner.rs` | Printing thread: heartbeat every 30 s, poll for a job every 3 s, back off 5–60 s while offline, stop when the PC is removed in the dashboard |
| `src/api.rs` | HTTP client (`ureq`). Downloads job PDFs from our own server URL so the token never goes elsewhere |
| `src/printers.rs` | `EnumPrintersW` + `DeviceCapabilitiesW`: name, color, duplex, paper sizes (A4/Legal/A3), state (offline, paper out, …) |
| `src/print.rs` | Prints through `SumatraPDF.exe -print-to <printer> -print-settings "monochrome,2x,1-3,5,duplexlong,paper=A4,shrink" -silent` (pages, both sides and paper size since 1.1.0; other sizes use `fit`) |
| `src/install.rs` | Per-user install / update / uninstall: copy, shortcuts, Installed-apps entry |
| `src/update.rs` | `agent.json` check, verified downloads (agent updates and SumatraPDF) |
| `src/system.rs` | Start with Windows (HKCU `Run`), single instance, quit/show signals between copies, message boxes |
| `src/config.rs` | Saved connection in `%APPDATA%\ScanAndPrint\agent.json`; the token is encrypted with Windows DPAPI |
| `src/log.rs` | Log to the console and `%APPDATA%\ScanAndPrint\agent.log` (tray menu → লগ ফাইল দেখুন) |
| `src/icon.rs`, `build.rs` | The icon, drawn in code; `build.rs` embeds it and version info in the exe |

- **Privacy.** PDFs are written to `%TEMP%\ScanAndPrint` and deleted right after printing. Leftovers from
  a crash are deleted at startup. Uninstall deletes the saved connection and logs.
- **Errors reported to the server and shown in the UI are in Bangla.** Log output is English.
- **"Completed" means the job reached the Windows print spooler**, not that paper came out.
- **It runs only while someone is logged in to Windows** (decided: tray app, not a service).

## SumatraPDF

Printing goes through [SumatraPDF](https://www.sumatrapdfreader.org/) 3.6.1 (GPLv3, unmodified, run as a
separate program; source: https://github.com/sumatrapdfreader/sumatrapdf). The website serves it from
`public/downloads/SumatraPDF-3.6.1-64.exe`; the agent downloads it next to itself on first start and checks
the SHA-256 pinned in `src/update.rs`. To upgrade it, replace the file, update `SUMATRA_PATH` and
`SUMATRA_SHA256`, and release a new agent version. It is also found via `SCAN_PRINT_SUMATRA`,
`%LOCALAPPDATA%\SumatraPDF` or `Program Files\SumatraPDF`.
