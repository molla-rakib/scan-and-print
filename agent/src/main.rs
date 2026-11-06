//! Scan & Print agent. Runs on the shop PC: reports the installed printers to the server, picks up
//! paid jobs, prints them and reports the result. See `agent/README.md`.

mod api;
mod config;
mod print;
mod printers;
mod runner;

use std::process::ExitCode;

use api::{ApiError, Client};

const VERSION: &str = env!("CARGO_PKG_VERSION");
const DEFAULT_SERVER: &str = "http://localhost:3000";

const USAGE: &str = "\
Scan & Print agent

Usage:
  scan-print-agent pair <CODE> [--server <URL>]   Connect this PC to a shop (code from Dashboard -> Devices)
  scan-print-agent run [--dry-run] [--include-virtual]
                                                  Wait for jobs and print them (the default when paired)
  scan-print-agent printers                       List the printers Windows has installed
  scan-print-agent status                         Show which shop this PC is connected to
  scan-print-agent unpair                         Forget the saved connection

Options:
  --server <URL>       Server address (default: SCAN_PRINT_SERVER or http://localhost:3000)
  --dry-run            Download jobs but do not print them (for testing without a printer)
  --include-virtual    Also offer fax / print-to-file printers (for testing)

Environment:
  SCAN_PRINT_SERVER    Server address used by `pair`
  SCAN_PRINT_SUMATRA   Path to SumatraPDF.exe if it is not next to the agent";

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let flag = |name: &str| args.iter().any(|a| a == name);
    let positional: Vec<&str> = {
        let mut out = Vec::new();
        let mut iter = args.iter();
        while let Some(arg) = iter.next() {
            if arg == "--server" {
                iter.next();
            } else if !arg.starts_with("--") {
                out.push(arg.as_str());
            }
        }
        out
    };

    if flag("--help") || flag("-h") || positional.first() == Some(&"help") {
        println!("{USAGE}");
        return ExitCode::SUCCESS;
    }
    if flag("--version") {
        println!("scan-print-agent {VERSION}");
        return ExitCode::SUCCESS;
    }

    match positional.first().copied() {
        Some("pair") => {
            let Some(code) = positional.get(1) else {
                eprintln!("Missing pairing code. Usage: scan-print-agent pair <CODE>");
                return ExitCode::from(2);
            };
            let server = args
                .iter()
                .position(|a| a == "--server")
                .and_then(|i| args.get(i + 1).cloned())
                .or_else(|| std::env::var("SCAN_PRINT_SERVER").ok())
                .unwrap_or_else(|| DEFAULT_SERVER.to_string());
            pair(code, &server)
        }
        Some("run") | None => match config::load() {
            Ok(Some(cfg)) => runner::run(cfg, runner::Options { dry_run: flag("--dry-run"), include_virtual: flag("--include-virtual") }),
            Ok(None) if positional.is_empty() => {
                println!("{USAGE}");
                ExitCode::SUCCESS
            }
            Ok(None) => {
                eprintln!("This PC is not paired yet. Run: scan-print-agent pair <CODE>");
                ExitCode::from(2)
            }
            Err(e) => {
                eprintln!("Could not read the saved connection: {e}");
                ExitCode::FAILURE
            }
        },
        Some("printers") => list_printers(),
        Some("status") => status(),
        Some("unpair") => match config::delete() {
            Ok(true) => {
                println!("Connection removed. Also remove this PC in Dashboard -> Devices.");
                ExitCode::SUCCESS
            }
            Ok(false) => {
                println!("This PC was not paired.");
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("Could not remove the saved connection: {e}");
                ExitCode::FAILURE
            }
        },
        Some(other) => {
            eprintln!("Unknown command \"{other}\".\n\n{USAGE}");
            ExitCode::from(2)
        }
    }
}

pub fn machine_name() -> String {
    std::env::var("COMPUTERNAME").unwrap_or_else(|_| "Windows PC".into())
}

fn pair(code: &str, server: &str) -> ExitCode {
    let client = Client::new(server, None);
    match client.pair(code, &machine_name(), VERSION) {
        Ok(result) => {
            let cfg = config::Config {
                server: server.trim_end_matches('/').to_string(),
                agent_id: result.agent_id,
                shop_name: result.shop.name,
                token: result.token,
            };
            if let Err(e) = config::save(&cfg) {
                eprintln!("Paired, but could not save the connection: {e}");
                return ExitCode::FAILURE;
            }
            println!("Paired with the shop. Next: enable printers in Dashboard -> Devices, then run `scan-print-agent run`.");
            ExitCode::SUCCESS
        }
        Err(ApiError::Status(404, _)) => {
            eprintln!("The pairing code is wrong or has expired. Create a new one in Dashboard -> Devices.");
            ExitCode::FAILURE
        }
        Err(e) => {
            eprintln!("Pairing failed: {e}");
            ExitCode::FAILURE
        }
    }
}

fn list_printers() -> ExitCode {
    match printers::list() {
        Ok(list) if list.is_empty() => {
            println!("No printers are installed in Windows.");
            ExitCode::SUCCESS
        }
        Ok(list) => {
            for p in list {
                println!("{}", p.name);
                println!(
                    "    {} | duplex: {} | state: {} | port: {} | driver: {}",
                    if p.color { "color" } else { "black & white" },
                    if p.duplex { "yes" } else { "no" },
                    p.state,
                    p.port,
                    p.driver
                );
                if let Some(reason) = p.skip_reason {
                    println!("    not offered to the server: {reason}");
                }
            }
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("Could not list printers: {e}");
            ExitCode::FAILURE
        }
    }
}

fn status() -> ExitCode {
    match config::load() {
        Ok(Some(cfg)) => {
            println!("Paired (agent {}) with server {}", cfg.agent_id, cfg.server);
            match print::find_sumatra() {
                Some(path) => println!("SumatraPDF: {}", path.display()),
                None => println!("SumatraPDF: not found (jobs will fail until it is installed next to the agent)"),
            }
            ExitCode::SUCCESS
        }
        Ok(None) => {
            println!("Not paired.");
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("Could not read the saved connection: {e}");
            ExitCode::FAILURE
        }
    }
}
