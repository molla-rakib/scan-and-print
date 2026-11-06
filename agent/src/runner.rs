//! The main loop: heartbeat every 30 s, poll for jobs every 3 s, survive internet outages.
//! Used by both the console (`run`) and the tray app, which listens to [`RunnerEvent`]s.

use std::{
    collections::BTreeSet,
    fs,
    path::Path,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    thread,
    time::{Duration, Instant},
};

use crate::{
    VERSION,
    api::{ApiError, Client, Job, PrinterReport},
    config::Config,
    log::log,
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

#[derive(Debug, Clone)]
pub enum RunnerEvent {
    /// Connected. `printers` were reported, `enabled` of them are switched on in the dashboard.
    Online { printers: usize, enabled: usize },
    Offline,
    /// Number of cash orders waiting for approval changed.
    PendingApprovals(u32),
    /// A job finished (`ok`) or failed.
    JobFinished { token: u32, ok: bool },
}

pub enum Exit {
    /// Asked to stop (quit or re-pair).
    Stopped,
    /// The server rejected the token: the PC was removed in the dashboard.
    Unauthorized,
}

/// Sleeps in small steps so a stop request is noticed quickly. Returns false if asked to stop.
fn sleep(duration: Duration, stop: &AtomicBool) -> bool {
    let until = Instant::now() + duration;
    while Instant::now() < until {
        if stop.load(Ordering::Relaxed) {
            return false;
        }
        thread::sleep(Duration::from_millis(200).min(until - Instant::now()));
    }
    !stop.load(Ordering::Relaxed)
}

pub fn run(cfg: &Config, opts: &Options, stop: Arc<AtomicBool>, notify: impl Fn(RunnerEvent)) -> Exit {
    let client = Client::new(&cfg.server, Some(cfg.token.clone()));
    let work_dir = std::env::temp_dir().join("ScanAndPrint");
    clear_dir(&work_dir);

    log(&format!("Scan & Print agent {VERSION} connected to {}", cfg.server));
    match (print::find_sumatra(), opts.dry_run) {
        (_, true) => log("Dry run: jobs are downloaded and marked completed without printing."),
        (Some(path), false) => log(&format!("Printing with {}", path.display())),
        (None, false) => log("SumatraPDF.exe not found yet; jobs will fail until it is next to the agent."),
    }

    let mut enabled: Option<BTreeSet<String>> = None;
    let mut pending_approvals: Option<u32> = None;
    let mut last_heartbeat: Option<Instant> = None;
    let mut backoff = MIN_BACKOFF;
    let mut offline_since: Option<Instant> = None;
    log("Waiting for jobs");

    loop {
        if stop.load(Ordering::Relaxed) {
            return Exit::Stopped;
        }
        let result = (|| -> Result<bool, ApiError> {
            if last_heartbeat.is_none_or(|t| t.elapsed() >= HEARTBEAT_EVERY) {
                heartbeat(&client, opts, &mut enabled, &notify)?;
                last_heartbeat = Some(Instant::now());
            }
            let claim = client.claim()?;
            if pending_approvals != Some(claim.pending_approvals) {
                pending_approvals = Some(claim.pending_approvals);
                notify(RunnerEvent::PendingApprovals(claim.pending_approvals));
            }
            match claim.job {
                Some(job) => {
                    let ok = process_job(&client, &job, &work_dir, opts.dry_run);
                    notify(RunnerEvent::JobFinished { token: job.token, ok });
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
                if !had_job && !sleep(POLL_EVERY, &stop) {
                    return Exit::Stopped;
                }
            }
            Err(ApiError::Unauthorized) => {
                log("The server no longer accepts this PC (it was removed in the dashboard). Pair again.");
                return Exit::Unauthorized;
            }
            Err(e) => {
                if offline_since.is_none() {
                    offline_since = Some(Instant::now());
                    log(&format!("Cannot reach the server ({e}). Retrying..."));
                    notify(RunnerEvent::Offline);
                }
                // Send a fresh heartbeat (and Online event) as soon as we are back.
                last_heartbeat = None;
                enabled = None;
                if !sleep(backoff, &stop) {
                    return Exit::Stopped;
                }
                backoff = (backoff * 2).min(MAX_BACKOFF);
            }
        }
    }
}

fn heartbeat(
    client: &Client,
    opts: &Options,
    last_enabled: &mut Option<BTreeSet<String>>,
    notify: &impl Fn(RunnerEvent),
) -> Result<(), ApiError> {
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
    if last_enabled.as_ref() != Some(&enabled) {
        if enabled.is_empty() {
            log(&format!("{} printer(s) reported. None enabled yet: enable them in Dashboard -> Devices.", reports.len()));
        } else {
            log(&format!("Printing on: {}", enabled.iter().cloned().collect::<Vec<_>>().join(", ")));
        }
        notify(RunnerEvent::Online { printers: reports.len(), enabled: enabled.len() });
        *last_enabled = Some(enabled);
    }
    Ok(())
}

/// Downloads, prints and reports one job. Returns whether it printed.
fn process_job(client: &Client, job: &Job, work_dir: &Path, dry_run: bool) -> bool {
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
            // Looked up per job: the tray app may download it after start-up.
            let Some(sumatra) = print::find_sumatra() else {
                return Err("দোকানের কম্পিউটারে প্রিন্ট সফটওয়্যার (SumatraPDF) পাওয়া যায়নি".to_string());
            };
            print::print_pdf(&sumatra, &file, &job.printer, job.color_mode == "color", job.copies)
        });

    // Customer documents never stay on the shop PC.
    let _ = fs::remove_file(&file);

    match &outcome {
        Ok(()) => log(if dry_run { "  done (dry run, not printed)" } else { "  sent to printer" }),
        Err(_) => log("  failed; reported to the dashboard"),
    }
    let ok = outcome.is_ok();
    report_with_retry(client, &job.id, outcome.err().as_deref());
    ok
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
fn clear_dir(dir: &Path) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let _ = fs::remove_file(entry.path());
        }
    }
}
