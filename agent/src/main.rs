//! Scan & Print agent. Runs on the shop PC: reports the installed printers to the server, picks up
//! paid jobs, prints them and reports the result. See `agent/README.md`.
//!
//! Started without arguments it is a tray app (what Windows starts at login). The subcommands are a
//! console interface for setup and debugging.

// Release builds are a GUI program, so no console window flashes up at login.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod config;
mod gui;
mod icon;
mod install;
mod log;
mod print;
mod printers;
mod runner;
mod system;
mod update;

use std::{
    process::ExitCode,
    sync::{Arc, atomic::AtomicBool},
};

use api::{ApiError, Client};

const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Production server, used by release builds.
const PRODUCTION_SERVER: &str = "https://scan-and-print.vercel.app";

/// Server used when pairing: `SCAN_PRINT_SERVER` at runtime, else one baked in at build time, else the
/// production site (release) or localhost (debug). After pairing, the saved connection's server is used.
fn default_server() -> String {
    std::env::var("SCAN_PRINT_SERVER")
        .ok()
        .or_else(|| option_env!("SCAN_PRINT_SERVER").map(str::to_string))
        .unwrap_or_else(|| if cfg!(debug_assertions) { "http://localhost:3000" } else { PRODUCTION_SERVER }.to_string())
        .trim_end_matches('/')
        .to_string()
}

const USAGE: &str = "\
Scan & Print agent

Usage:
  scan-print-agent                                Tray app (what starts with Windows)
  scan-print-agent pair <CODE> [--server <URL>]   Connect this PC to a shop (code from Dashboard -> Devices)
  scan-print-agent run [--dry-run] [--include-virtual]
                                                  Console mode: wait for jobs and print them
  scan-print-agent printers                       List the printers Windows has installed
  scan-print-agent status                         Show which shop this PC is connected to
  scan-print-agent autostart on|off               Start the tray app when this Windows user logs in
  scan-print-agent unpair                         Forget the saved connection
  scan-print-agent install                        Install to %LOCALAPPDATA%\\Programs\\ScanAndPrint and start
  scan-print-agent uninstall                      Remove the agent, its shortcuts and saved connection

Options:
  --server <URL>       Server address (default: SCAN_PRINT_SERVER, else the built-in one)
  --dry-run            Download jobs but do not print them (for testing without a printer)
  --include-virtual    Also offer fax / print-to-file printers (for testing)

Environment:
  SCAN_PRINT_SERVER    Server address used for pairing
  SCAN_PRINT_SUMATRA   Path to SumatraPDF.exe if it is not next to the agent";

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();

    if args.is_empty() {
        // The downloaded exe installs itself first (release builds; dev builds run in place).
        if !cfg!(debug_assertions) && !install::is_installed_copy() {
            return run_installer();
        }
        // Only one tray app per Windows user; a second launch brings the running one to the front.
        let Some(_instance) = system::single_instance() else {
            system::signal_show();
            return ExitCode::SUCCESS;
        };
        gui::run(default_server());
        return ExitCode::SUCCESS;
    }

    match args[0].as_str() {
        #[cfg(debug_assertions)]
        "ui-preview" => {
            gui::preview(args.get(1).map(String::as_str).unwrap_or("pair"));
            return ExitCode::SUCCESS;
        }
        "install" => return run_installer(),
        "uninstall" => {
            return match install::uninstall() {
                Ok(()) => {
                    system::message("Scan & Print এজেন্ট এই কম্পিউটার থেকে সরানো হয়েছে।\nড্যাশবোর্ডের ডিভাইস পেজ থেকেও কম্পিউটারটি সরিয়ে দিন।", false);
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    system::message(&format!("আনইনস্টল করা যায়নি।\n\n{e}"), true);
                    ExitCode::FAILURE
                }
            };
        }
        _ => {}
    }

    // Release builds have no console of their own; print to the terminal we were started from.
    #[cfg(not(debug_assertions))]
    unsafe {
        let _ = windows::Win32::System::Console::AttachConsole(windows::Win32::System::Console::ATTACH_PARENT_PROCESS);
    }
    cli(&args)
}

fn cli(args: &[String]) -> ExitCode {
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
                .unwrap_or_else(default_server);
            pair(code, &server)
        }
        Some("run") => run_console(flag("--dry-run"), flag("--include-virtual")),
        Some("printers") => list_printers(),
        Some("status") => status(),
        Some("autostart") => match positional.get(1).copied() {
            Some(state @ ("on" | "off")) => match system::set_autostart(state == "on") {
                Ok(()) => {
                    println!("Start with Windows: {state}");
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("Could not change start with Windows: {e}");
                    ExitCode::FAILURE
                }
            },
            _ => {
                println!("Start with Windows: {}", if system::autostart_enabled() { "on" } else { "off" });
                ExitCode::SUCCESS
            }
        },
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
        None => unreachable!("handled in main"),
    }
}

fn run_installer() -> ExitCode {
    match install::install() {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            log::log(&format!("Install failed: {e}"));
            system::message(&format!("Scan & Print এজেন্ট ইনস্টল করা যায়নি।\n\n{e}"), true);
            ExitCode::FAILURE
        }
    }
}

pub fn machine_name() -> String {
    std::env::var("COMPUTERNAME").unwrap_or_else(|_| "Windows PC".into())
}

fn run_console(dry_run: bool, include_virtual: bool) -> ExitCode {
    let cfg = match config::load() {
        Ok(Some(cfg)) => cfg,
        Ok(None) => {
            eprintln!("This PC is not paired yet. Run: scan-print-agent pair <CODE>");
            return ExitCode::from(2);
        }
        Err(e) => {
            eprintln!("Could not read the saved connection: {e}");
            return ExitCode::FAILURE;
        }
    };
    let Some(_instance) = system::single_instance() else {
        eprintln!("The agent is already running (check the tray). Quit it first.");
        return ExitCode::FAILURE;
    };
    let opts = runner::Options { dry_run, include_virtual };
    match runner::run(&cfg, &opts, Arc::new(AtomicBool::new(false)), |_| {}) {
        runner::Exit::Stopped => ExitCode::SUCCESS,
        runner::Exit::Unauthorized => ExitCode::from(3),
    }
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
            println!("Paired with the shop. Next: enable printers in Dashboard -> Devices, then start the agent.");
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
            println!("Start with Windows: {}", if system::autostart_enabled() { "on" } else { "off" });
            println!("Log: {}", log::path().display());
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
