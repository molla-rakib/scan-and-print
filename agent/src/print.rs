//! Sends a PDF to a Windows printer through the SumatraPDF command line.

use std::{
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::{Duration, Instant},
};

/// Give up on a print that has not been handed to the spooler after this long.
const PRINT_TIMEOUT: Duration = Duration::from_secs(10 * 60);

/// Where to look for SumatraPDF.exe, in order. The installer will put it next to the agent.
pub fn find_sumatra() -> Option<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(path) = std::env::var_os("SCAN_PRINT_SUMATRA") {
        candidates.push(PathBuf::from(path));
    }
    if let Some(dir) = std::env::current_exe().ok().and_then(|exe| exe.parent().map(Path::to_path_buf)) {
        candidates.push(dir.join("SumatraPDF.exe"));
    }
    if let Some(dir) = std::env::var_os("LOCALAPPDATA") {
        candidates.push(PathBuf::from(dir).join("SumatraPDF").join("SumatraPDF.exe"));
    }
    for var in ["ProgramFiles", "ProgramFiles(x86)"] {
        if let Some(dir) = std::env::var_os(var) {
            candidates.push(PathBuf::from(dir).join("SumatraPDF").join("SumatraPDF.exe"));
        }
    }
    candidates.into_iter().find(|path| path.is_file())
}

/// Prints `file` on `printer`. The error is shown to the shop owner, so it is in Bangla.
pub fn print_pdf(sumatra: &Path, file: &Path, printer: &str, color: bool, copies: u32) -> Result<(), String> {
    // "shrink" only scales down pages that are larger than the paper; normal A4 prints at 100%.
    let settings = format!("{},{}x,shrink", if color { "color" } else { "monochrome" }, copies.max(1));
    let mut child = Command::new(sumatra)
        .arg("-print-to")
        .arg(printer)
        .arg("-print-settings")
        .arg(&settings)
        .arg("-silent")
        .arg(file)
        .spawn()
        .map_err(|e| format!("প্রিন্ট সফটওয়্যার চালু করা যায়নি ({e})"))?;

    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) if status.success() => return Ok(()),
            Ok(Some(status)) => {
                let code = status.code().map(|c| c.to_string()).unwrap_or_default();
                return Err(format!("প্রিন্টারে পাঠানো যায়নি (কোড {code})"));
            }
            Ok(None) if started.elapsed() > PRINT_TIMEOUT => {
                let _ = child.kill();
                return Err("প্রিন্ট করতে অনেক বেশি সময় লাগছে, বাতিল করা হয়েছে".into());
            }
            Ok(None) => thread::sleep(Duration::from_millis(250)),
            Err(e) => return Err(format!("প্রিন্টারে পাঠানো যায়নি ({e})")),
        }
    }
}
