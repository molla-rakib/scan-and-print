//! Log to the console (when there is one) and to `%APPDATA%\ScanAndPrint\agent.log`.
//! The tray app has no console, so the file is what the owner (or we) can look at.

use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::PathBuf,
    sync::Mutex,
};

/// The log is restarted once it grows past this size; the old one is kept as agent.old.log.
const MAX_LOG_BYTES: u64 = 1024 * 1024;

static LOCK: Mutex<()> = Mutex::new(());

pub fn path() -> PathBuf {
    crate::config::data_dir().join("agent.log")
}

pub fn log(message: &str) {
    let line = format!("[{}] {message}", timestamp());
    println!("{line}");

    let _guard = LOCK.lock();
    let path = path();
    if fs::metadata(&path).is_ok_and(|m| m.len() > MAX_LOG_BYTES) {
        let _ = fs::rename(&path, path.with_file_name("agent.old.log"));
    }
    let _ = fs::create_dir_all(crate::config::data_dir());
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&path) {
        let _ = writeln!(file, "{line}");
    }
}

/// Local time as YYYY-MM-DD HH:MM:SS.
fn timestamp() -> String {
    let t = unsafe { windows::Win32::System::SystemInformation::GetLocalTime() };
    format!("{}-{:02}-{:02} {:02}:{:02}:{:02}", t.wYear, t.wMonth, t.wDay, t.wHour, t.wMinute, t.wSecond)
}
