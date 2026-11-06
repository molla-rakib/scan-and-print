//! The main loop: heartbeat every 30 s, poll for jobs every 3 s, survive internet outages.

use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
    process::ExitCode,
    thread,
    time::{Duration, Instant},
};

use crate::{
    VERSION,
    api::{ApiError, Client, Job, PrinterReport},
    config::Config,
    machine_name, print, printers,
};

const HEARTBEAT_EVERY: Duration = Duration::from_secs(30);
const POLL_EVERY: Duration = Duration::from_secs(3);
const MIN_BACKOFF: Duration = Duration::from_secs(5);
const MAX_BACKOFF: Duration = Duration::from_secs(60);
/// How long to keep retrying a result report before giving up on it.
const REPORT_RETRY_FOR: Duration = Duration::from_secs(10 * 60);

pub struct Options {
    pub dry_run: bool,
    pub include_virtual: bool,
}

struct State {
    enabled: Option<BTreeSet<String>>,
    pending_approvals: u32,
}

pub fn run(cfg: Config, opts: Options) -> ExitCode {
    let client = Client::new(&cfg.server, Some(cfg.token.clone()));
    let work_dir = std::env::temp_dir().join("ScanAndPrint");
    clear_dir(&work_dir);

    log(&format!("Scan & Print agent {VERSION} connected to {}", cfg.server));
    let sumatra = print::find_sumatra();
    match (&sumatra, opts.dry_run) {
        (_, true) => log("Dry run: jobs are downloaded and marked completed without printing."),
        (Some(path), false) => log(&format!("Printing with {}", path.display())),
        (None, false) => log("WARNING: SumatraPDF.exe not found. Put it next to the agent or set SCAN_PRINT_SUMATRA; jobs will fail until then."),
    }

    let mut state = State { enabled: None, pending_approvals: 0 };
    let mut last_heartbeat: Option<Instant> = None;
    let mut backoff = MIN_BACKOFF;
    let mut offline_since: Option<Instant> = None;
    log("Waiting for jobs (Ctrl+C to stop)");

    loop {
        let result = (|| -> Result<bool, ApiError> {
            if last_heartbeat.is_none_or(|t| t.elapsed() >= HEARTBEAT_EVERY) {
                heartbeat(&client, &opts, &mut state)?;
                last_heartbeat = Some(Instant::now());
            }
            match client.claim()? {
                Some(job) => {
                    process_job(&client, &job, &work_dir, sumatra.as_deref(), opts.dry_run);
                    Ok(true)
                }
                None => Ok(false),
            }
        })();

        match result {
            Ok(had_job) => {
                if let Some(since) = offline_since.take() {
                    log(&format!("Reconnected after {}s", since.elapsed().as_secs()));
                }
                backoff = MIN_BACKOFF;
                if !had_job {
                    thread::sleep(POLL_EVERY);
                }
            }
            Err(ApiError::Unauthorized) => {
                log("The server no longer accepts this PC (it was removed in the dashboard). Pair again with: scan-print-agent pair <CODE>");
                return ExitCode::from(3);
            }
            Err(e) => {
                if offline_since.is_none() {
                    offline_since = Some(Instant::now());
                    log(&format!("Cannot reach the server ({e}). Retrying..."));
                }
                // Send a fresh heartbeat as soon as we are back online.
                last_heartbeat = None;
                thread::sleep(backoff);
                backoff = (backoff * 2).min(MAX_BACKOFF);
            }
        }
    }
}

fn heartbeat(client: &Client, opts: &Options, state: &mut State) -> Result<(), ApiError> {
    let list = printers::list().unwrap_or_else(|e| {
        log(&format!("Could not list printers: {e}"));
        Vec::new()
    });
    let reports: Vec<PrinterReport> = list
        .into_iter()
        .filter(|p| opts.include_virtual || p.skip_reason.is_none())
        .map(|p| PrinterReport { system_name: p.name, color: p.color, duplex: p.duplex, state: p.state.to_string() })
        .collect();

    let response = client.heartbeat(&machine_name(), VERSION, &reports)?;

    let enabled: BTreeSet<String> = response.devices.into_iter().filter(|d| d.enabled).map(|d| d.system_name).collect();
    if state.enabled.as_ref() != Some(&enabled) {
        if enabled.is_empty() {
            log(&format!("{} printer(s) reported. None enabled yet: enable them in Dashboard -> Devices.", reports.len()));
        } else {
            log(&format!("Printing on: {}", enabled.iter().cloned().collect::<Vec<_>>().join(", ")));
        }
        state.enabled = Some(enabled);
    }
    if response.pending_approvals > state.pending_approvals {
        log(&format!("{} cash order(s) waiting for approval in the dashboard", response.pending_approvals));
    }
    state.pending_approvals = response.pending_approvals;
    Ok(())
}

fn process_job(client: &Client, job: &Job, work_dir: &Path, sumatra: Option<&Path>, dry_run: bool) {
    log(&format!(
        "Job #{}: {} page(s) x {} cop{} ({}) -> {}",
        job.token,
        job.page_count,
        job.copies,
        if job.copies == 1 { "y" } else { "ies" },
        if job.color_mode == "color" { "color" } else { "B/W" },
        job.printer
    ));

    let file = work_dir.join(format!("job-{}.pdf", safe_name(&job.id)));
    let outcome = fs::create_dir_all(work_dir)
        .map_err(|e| format!("ফাইল রাখার জায়গা তৈরি করা যায়নি ({e})"))
        .and_then(|()| match client.download(&job.id, &file) {
            Ok(_) => Ok(()),
            Err(e) => {
                log(&format!("  download failed: {e}"));
                Err("ফাইল ডাউনলোড করা যায়নি".to_string())
            }
        })
        .and_then(|()| {
            if dry_run {
                thread::sleep(Duration::from_secs(2));
                return Ok(());
            }
            let Some(sumatra) = sumatra else {
                return Err("শপের কম্পিউটারে প্রিন্ট সফটওয়্যার (SumatraPDF) পাওয়া যায়নি".to_string());
            };
            print::print_pdf(sumatra, &file, &job.printer, job.color_mode == "color", job.copies)
        });

    // Customer documents never stay on the shop PC.
    let _ = fs::remove_file(&file);

    match &outcome {
        Ok(()) => log(if dry_run { "  done (dry run, not printed)" } else { "  sent to printer" }),
        Err(_) => log("  failed; reported to the dashboard"),
    }
    report_with_retry(client, &job.id, outcome.err().as_deref());
}

/// The job stays "printing" on the server until we report, so keep trying through short outages.
fn report_with_retry(client: &Client, job_id: &str, error: Option<&str>) {
    let started = Instant::now();
    let mut backoff = MIN_BACKOFF;
    loop {
        match client.report(job_id, error) {
            Ok(()) => return,
            Err(ApiError::Network(e)) if started.elapsed() < REPORT_RETRY_FOR => {
                log(&format!("  could not report result ({e}), retrying..."));
                thread::sleep(backoff);
                backoff = (backoff * 2).min(MAX_BACKOFF);
            }
            Err(e) => {
                log(&format!("  could not report result: {e}"));
                return;
            }
        }
    }
}

fn safe_name(id: &str) -> String {
    id.chars().filter(char::is_ascii_alphanumeric).take(64).collect()
}

/// Deletes PDFs left behind by a crash or power cut.
fn clear_dir(dir: &PathBuf) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let _ = fs::remove_file(entry.path());
        }
    }
}

fn log(message: &str) {
    println!("[{}] {message}", clock());
}

/// Local wall-clock time as HH:MM:SS.
fn clock() -> String {
    let t = unsafe { windows::Win32::System::SystemInformation::GetLocalTime() };
    format!("{:02}:{:02}:{:02}", t.wHour, t.wMinute, t.wSecond)
}
