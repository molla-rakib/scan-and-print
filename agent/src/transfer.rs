//! Counter transfers between this PC and a customer's phone, run from the counter window
//! (`ui/counter.html`). The server holds the session (`app/api/agent/transfers`); the phone joins it by
//! scanning the QR the window shows.
//!
//! - **Scan**: the copier or scanner saves scans into `Documents\Mudron\Scans`; each new file is sent to the
//!   phone once it is fully written, then deleted here.
//! - **Receive**: files the customer sends are saved into `Documents\Mudron\Inbox`, and the server deletes
//!   its copy once saved.

use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    thread,
    time::{Duration, Instant},
};

use windows::Win32::UI::Shell::FOLDERID_Documents;

use crate::{
    api::{ApiError, Client},
    config::Config,
    install,
    log::log,
};

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Kind {
    Scan,
    Receive,
}

impl Kind {
    pub fn parse(value: &str) -> Option<Kind> {
        match value {
            "scan" => Some(Kind::Scan),
            "receive" => Some(Kind::Receive),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Kind::Scan => "scan",
            Kind::Receive => "receive",
        }
    }
}

pub enum TransferEvent {
    Opened { kind: Kind, qr_svg: String },
    /// Could not start, or a problem the window should show.
    Failed(String),
    /// A scan reached the phone.
    Sent(String),
    /// A file could not be sent or saved (after a few tries).
    SendFailed { name: String, error: String },
    /// A customer's file was saved on this PC.
    Received { name: String, path: PathBuf },
    /// The session ended (closed here, or timed out on the server).
    Closed,
}

/// Scans that may be sent to a phone.
const SCAN_EXTENSIONS: [&str; 4] = ["pdf", "jpg", "jpeg", "png"];
/// Files a customer may send (the server checks the same list): documents and pictures, never programs.
const RECEIVE_EXTENSIONS: [&str; 16] = [
    "pdf", "jpg", "jpeg", "png", "webp", "heic", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "odt", "csv",
];
const SCAN_POLL: Duration = Duration::from_millis(1500);
const RECEIVE_POLL: Duration = Duration::from_secs(2);
/// How often a scan session asks the server whether it is still open.
const STATE_EVERY: Duration = Duration::from_secs(5);
const MAX_TRIES: u32 = 3;

fn documents_dir() -> PathBuf {
    install::known_folder(&FOLDERID_Documents).unwrap_or_else(|| {
        std::env::var_os("USERPROFILE").map(PathBuf::from).unwrap_or_else(|| PathBuf::from(".")).join("Documents")
    })
}

pub fn scan_dir() -> PathBuf {
    documents_dir().join("Mudron").join("Scans")
}

pub fn inbox_dir() -> PathBuf {
    documents_dir().join("Mudron").join("Inbox")
}

/// Runs one session until `stop` is set or the server closes it, reporting what happens through `notify`.
pub fn run(cfg: &Config, kind: Kind, stop: Arc<AtomicBool>, notify: impl Fn(TransferEvent)) {
    let client = Client::new(&cfg.server, Some(cfg.token.clone()));
    let dir = match kind {
        Kind::Scan => scan_dir(),
        Kind::Receive => inbox_dir(),
    };
    if let Err(e) = fs::create_dir_all(&dir) {
        notify(TransferEvent::Failed(format!("ফোল্ডার তৈরি করা যায়নি: {e}")));
        notify(TransferEvent::Closed);
        return;
    }
    let opened = match client.open_transfer(kind.as_str()) {
        Ok(opened) => opened,
        Err(e) => {
            log(&format!("Could not open a {} transfer: {e}", kind.as_str()));
            notify(TransferEvent::Failed(bangla(&e)));
            notify(TransferEvent::Closed);
            return;
        }
    };
    log(&format!("Opened {} transfer {}", kind.as_str(), opened.url));
    notify(TransferEvent::Opened { kind, qr_svg: opened.qr_svg });

    match kind {
        Kind::Scan => scan_loop(&client, &opened.id, &dir, &stop, &notify),
        Kind::Receive => receive_loop(&client, &opened.id, &dir, &stop, &notify),
    }

    // Closed here or timed out: either way the server deletes the session's files now.
    if let Err(e) = client.close_transfer(&opened.id) {
        log(&format!("Could not close transfer {}: {e}", opened.id));
    }
    notify(TransferEvent::Closed);
}

fn scan_loop(client: &Client, id: &str, dir: &Path, stop: &AtomicBool, notify: &impl Fn(TransferEvent)) {
    // Files already in the folder belong to earlier work; only scans made during the session are sent.
    let mut done: HashSet<PathBuf> = scan_files(dir).into_iter().collect();
    let mut sizes: HashMap<PathBuf, u64> = HashMap::new();
    let mut tries: HashMap<PathBuf, u32> = HashMap::new();
    let mut last_state = Instant::now();

    while !stop.load(Ordering::Relaxed) {
        if last_state.elapsed() >= STATE_EVERY {
            last_state = Instant::now();
            match client.transfer_state(id) {
                Ok(state) if !state.open => return,
                Err(ApiError::Status(404 | 410, _)) | Err(ApiError::Unauthorized) => return,
                _ => {}
            }
        }
        for path in scan_files(dir) {
            if done.contains(&path) {
                continue;
            }
            let Ok(size) = fs::metadata(&path).map(|m| m.len()) else { continue };
            // A scanner writes the file over a few seconds: send it once its size stops changing.
            if size == 0 || sizes.insert(path.clone(), size) != Some(size) {
                continue;
            }
            let name = file_name(&path);
            match client.send_scan(id, &name, &path) {
                Ok(()) => {
                    done.insert(path.clone());
                    sizes.remove(&path);
                    // The customer has it now; don't leave their NID or certificate on the shop PC.
                    if let Err(e) = fs::remove_file(&path) {
                        log(&format!("Could not delete sent scan {}: {e}", path.display()));
                    }
                    notify(TransferEvent::Sent(name));
                }
                Err(ApiError::Status(410, _)) => return,
                Err(e) => {
                    let count = tries.entry(path.clone()).or_default();
                    *count += 1;
                    if *count >= MAX_TRIES {
                        done.insert(path.clone());
                        notify(TransferEvent::SendFailed { name, error: bangla(&e) });
                    }
                }
            }
        }
        wait(SCAN_POLL, stop);
    }
}

fn receive_loop(client: &Client, id: &str, dir: &Path, stop: &AtomicBool, notify: &impl Fn(TransferEvent)) {
    let mut done: HashSet<String> = HashSet::new();
    let mut tries: HashMap<String, u32> = HashMap::new();

    while !stop.load(Ordering::Relaxed) {
        match client.transfer_state(id) {
            Ok(state) => {
                let waiting: Vec<_> =
                    state.files.iter().filter(|f| f.from == "customer" && f.available && !f.fetched && !done.contains(&f.id)).collect();
                for file in waiting {
                    let name = safe_file_name(&file.name);
                    if !allowed(&name, &RECEIVE_EXTENSIONS) {
                        done.insert(file.id.clone());
                        notify(TransferEvent::SendFailed { name, error: "এই ধরনের ফাইল নেওয়া হয় না".into() });
                        continue;
                    }
                    let dest = unique_path(dir, &name);
                    let result = client.fetch_transfer_file(id, &file.id, &dest).and_then(|_| client.ack_transfer_file(id, &file.id));
                    match result {
                        Ok(()) => {
                            done.insert(file.id.clone());
                            log(&format!("Saved a customer's file to {}", dest.display()));
                            notify(TransferEvent::Received { name, path: dest });
                        }
                        Err(e) => {
                            let _ = fs::remove_file(&dest);
                            let count = tries.entry(file.id.clone()).or_default();
                            *count += 1;
                            if *count >= MAX_TRIES {
                                done.insert(file.id.clone());
                                notify(TransferEvent::SendFailed { name, error: bangla(&e) });
                            }
                        }
                    }
                }
                if !state.open {
                    return;
                }
            }
            Err(ApiError::Status(404, _)) | Err(ApiError::Unauthorized) => return,
            Err(e) => log(&format!("Transfer {id}: {e}")),
        }
        wait(RECEIVE_POLL, stop);
    }
}

/// Sleeps up to `duration`, waking early when `stop` is set.
fn wait(duration: Duration, stop: &AtomicBool) {
    let until = Instant::now() + duration;
    while Instant::now() < until && !stop.load(Ordering::Relaxed) {
        thread::sleep(Duration::from_millis(100));
    }
}

fn allowed(name: &str, extensions: &[&str]) -> bool {
    Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| extensions.contains(&e.to_ascii_lowercase().as_str()))
}

fn scan_files(dir: &Path) -> Vec<PathBuf> {
    let Ok(entries) = fs::read_dir(dir) else { return Vec::new() };
    entries
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.is_file() && allowed(&file_name(p), &SCAN_EXTENSIONS))
        .collect()
}

fn file_name(path: &Path) -> String {
    path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default()
}

/// A name safe to create in the inbox: no folders or characters Windows forbids, not a reserved device name.
fn safe_file_name(name: &str) -> String {
    let base = name.rsplit(['/', '\\']).next().unwrap_or_default();
    let mut cleaned: String = base.chars().map(|c| if c.is_control() || "<>:\"|?*".contains(c) { '_' } else { c }).collect();
    cleaned = cleaned.trim().trim_end_matches(['.', ' ']).trim_start_matches('.').to_string();
    if cleaned.is_empty() {
        cleaned = "file".into();
    }
    let stem = cleaned.split('.').next().unwrap_or_default().to_ascii_uppercase();
    let reserved = ["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "LPT1", "LPT2", "LPT3"];
    if reserved.contains(&stem.as_str()) {
        cleaned.insert(0, '_');
    }
    cleaned
}

/// `dir\name`, or `dir\name (2).ext` and so on when that file exists.
fn unique_path(dir: &Path, name: &str) -> PathBuf {
    let first = dir.join(name);
    if !first.exists() {
        return first;
    }
    let path = Path::new(name);
    let stem = path.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default();
    let ext = path.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
    (2..)
        .map(|n| dir.join(format!("{stem} ({n}){ext}")))
        .find(|p| !p.exists())
        .unwrap_or(first)
}

fn bangla(error: &ApiError) -> String {
    match error {
        ApiError::Status(_, message) if !message.is_empty() => message.clone(),
        ApiError::Unauthorized => "এই কম্পিউটারটি দোকান থেকে সরানো হয়েছে।".into(),
        ApiError::Network(_) => "সার্ভারে পৌঁছানো যাচ্ছে না। ইন্টারনেট সংযোগ দেখুন।".into(),
        ApiError::Status(code, _) => format!("সার্ভারে সমস্যা হয়েছে ({code})"),
    }
}

/// Whether `path` lies inside one of the transfer folders (the window may only open files there).
pub fn in_transfer_folder(path: &Path) -> bool {
    let Ok(path) = path.canonicalize() else { return false };
    [inbox_dir(), scan_dir()].iter().filter_map(|d| d.canonicalize().ok()).any(|dir| path.starts_with(dir))
}
