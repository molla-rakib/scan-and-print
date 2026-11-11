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
    if let Some(path) = std::env::var_os("MUDRON_SUMATRA") {
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

/// How to print a job, as ordered by the customer.
pub struct PrintOptions<'a> {
    pub color: bool,
    pub copies: u32,
    /// Page ranges such as "1-3,5"; None prints every page.
    pub pages: Option<&'a str>,
    pub duplex: bool,
    /// "A4", "Legal" or "A3"; None means A4.
    pub paper_size: Option<&'a str>,
}

/// The value of SumatraPDF's `-print-settings`, e.g. "monochrome,2x,1-3,5,duplexlong,paperkind=9,shrink".
fn print_settings(options: &PrintOptions) -> Result<String, String> {
    let mut settings = vec![
        if options.color { "color" } else { "monochrome" }.to_string(),
        format!("{}x", options.copies.max(1)),
    ];
    if let Some(pages) = options.pages.filter(|p| !p.is_empty()) {
        if !pages.chars().all(|c| c.is_ascii_digit() || c == ',' || c == '-') {
            return Err("পৃষ্ঠার তালিকা বোঝা যায়নি".into());
        }
        settings.push(pages.to_string());
    }
    settings.push(if options.duplex { "duplexlong" } else { "simplex" }.to_string());
    let paper = options.paper_size.unwrap_or("A4");
    let Some(paper_id) = crate::printers::paper_id(paper) else {
        return Err(format!("অজানা কাগজের মাপ ({paper})"));
    };
    // By id, not "paper=legal": SumatraPDF 3.6.1 only matches a name when the driver calls the paper exactly
    // that ("Legal 8.5 x 14" doesn't match), and then silently keeps another paper, often losing duplex too.
    settings.push(format!("paperkind={paper_id}"));
    // "shrink" only scales down pages larger than the paper, so normal A4 prints at 100%.
    // On other paper sizes "fit" scales the page to fill the sheet.
    settings.push(if paper == "A4" { "shrink" } else { "fit" }.to_string());
    Ok(settings.join(","))
}

/// Prints `file` on `printer`. The error is shown to the shop owner, so it is in Bangla.
pub fn print_pdf(sumatra: &Path, file: &Path, printer: &str, options: &PrintOptions) -> Result<(), String> {
    let settings = print_settings(options)?;
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
