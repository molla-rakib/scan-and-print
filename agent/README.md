# Scan & Print agent (Rust)

The program that runs on the shop's Windows PC. It reports the installed printers to the server, picks up
paid jobs, prints them and reports the result. It speaks the same API as `scripts/dev-agent.mjs`
(`app/api/agent/*`).

## Build

```bash
cd agent
cargo build --release      # target/release/scan-print-agent.exe (~1.5 MB)
```

## Use

```bash
scan-print-agent pair <CODE> [--server http://localhost:3000]   # code from Dashboard → Devices
scan-print-agent run                 # wait for jobs and print them (default command when paired)
scan-print-agent run --dry-run       # download jobs and mark them done without printing
scan-print-agent printers            # what Windows has installed, with color/duplex/state
scan-print-agent status | unpair
```

`--include-virtual` also offers fax and "print to file" printers (such as Microsoft Print to PDF) to the
server. Use it with `--dry-run` to test on a PC without a real printer.

## How it works

| File | What it does |
|---|---|
| `src/main.rs` | Command-line parsing, `pair`, `printers`, `status`, `unpair` |
| `src/runner.rs` | Main loop: heartbeat every 30 s, poll for a job every 3 s, back off 5–60 s while offline, exit with code 3 if the PC was removed in the dashboard |
| `src/api.rs` | HTTP client (`ureq`). Downloads the PDF from our own server URL so the token never goes elsewhere |
| `src/printers.rs` | `EnumPrintersW` + `DeviceCapabilitiesW`: name, color, duplex, state (offline, paper out, …) |
| `src/print.rs` | Prints through `SumatraPDF.exe -print-to <printer> -print-settings "monochrome,2x,shrink" -silent` |
| `src/config.rs` | Saved connection in `%APPDATA%\ScanAndPrint\agent.json`; the token is encrypted with Windows DPAPI |

- **Privacy.** PDFs are written to `%TEMP%\ScanAndPrint` and deleted right after printing. Leftovers from
  a crash are deleted at startup.
- **Errors reported to the server are in Bangla** because the shop owner sees them in the dashboard.
  Console output is English.
- **"Completed" means the job reached the Windows print spooler**, not that paper came out.

## SumatraPDF

The agent prints through [SumatraPDF](https://www.sumatrapdfreader.org/) (GPLv3, shipped unmodified as a
separate program). It looks for `SumatraPDF.exe` in this order: `SCAN_PRINT_SUMATRA`, next to the agent
exe, `%LOCALAPPDATA%\SumatraPDF`, `Program Files\SumatraPDF`. The installer will put it next to the agent.
