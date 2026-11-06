//! Auto-update and the SumatraPDF download. Both fetch from our own server and check a SHA-256 hash
//! before anything is run.
//!
//! The server publishes `public/downloads/agent.json` (written by `agent/release.ps1`):
//! `{ "version": "0.3.0", "url": "/downloads/ScanAndPrintAgent.exe", "sha256": "…" }`

use std::{
    fs::{self, File},
    io::{Read, Write},
    path::{Path, PathBuf},
    time::Duration,
};

use serde::Deserialize;
use sha2::{Digest, Sha256};

use crate::{VERSION, install, log::log};

/// SumatraPDF we print with, served from our own site (`public/downloads/`).
pub const SUMATRA_PATH: &str = "/downloads/SumatraPDF-3.6.1-64.exe";
pub const SUMATRA_SHA256: &str = "719f689b34f47be8ca105ce8484948474dafde0e106bab599e4a89326070c3d0";

const MAX_DOWNLOAD_BYTES: u64 = 100 * 1024 * 1024;

#[derive(Deserialize)]
struct Manifest {
    version: String,
    url: String,
    sha256: String,
}

fn http() -> ureq::Agent {
    ureq::Agent::config_builder()
        .timeout_connect(Some(Duration::from_secs(15)))
        .timeout_recv_response(Some(Duration::from_secs(30)))
        .timeout_recv_body(Some(Duration::from_secs(900)))
        .user_agent(concat!("scan-print-agent/", env!("CARGO_PKG_VERSION")))
        .build()
        .into()
}

fn absolute(server: &str, url: &str) -> String {
    if url.starts_with("http://") || url.starts_with("https://") { url.to_string() } else { format!("{server}{url}") }
}

/// Downloads `url` to `dest` and checks its SHA-256. A file that fails the check is deleted.
pub fn download_verified(url: &str, dest: &Path, sha256: &str) -> Result<(), String> {
    let response = http().get(url).call().map_err(|e| format!("download failed: {e}"))?;
    let mut reader = response.into_body().into_with_config().limit(MAX_DOWNLOAD_BYTES).reader();
    let partial = dest.with_extension("part");
    let mut file = File::create(&partial).map_err(|e| format!("cannot write {}: {e}", partial.display()))?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 64 * 1024];
    loop {
        let n = reader.read(&mut buffer).map_err(|e| format!("download failed: {e}"))?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
        file.write_all(&buffer[..n]).map_err(|e| format!("cannot write {}: {e}", partial.display()))?;
    }
    drop(file);
    let actual: String = hasher.finalize().iter().map(|b| format!("{b:02x}")).collect();
    if !actual.eq_ignore_ascii_case(sha256) {
        let _ = fs::remove_file(&partial);
        return Err(format!("checksum mismatch for {url}"));
    }
    fs::rename(&partial, dest).map_err(|e| format!("cannot save {}: {e}", dest.display()))
}

/// Where SumatraPDF should live: next to the agent exe.
pub fn sumatra_target() -> Option<PathBuf> {
    Some(std::env::current_exe().ok()?.parent()?.join("SumatraPDF.exe"))
}

/// Downloads SumatraPDF next to the agent if it is not there yet.
pub fn ensure_sumatra(server: &str) -> Result<(), String> {
    if crate::print::find_sumatra().is_some() {
        return Ok(());
    }
    let dest = sumatra_target().ok_or("cannot find the agent folder")?;
    log("Downloading SumatraPDF");
    download_verified(&absolute(server, SUMATRA_PATH), &dest, SUMATRA_SHA256)?;
    log("SumatraPDF downloaded");
    Ok(())
}

/// Newer version available on the server, downloaded and verified. Returns the path of the new exe.
pub fn check_and_download(server: &str) -> Result<Option<PathBuf>, String> {
    let manifest: Manifest = http()
        .get(format!("{server}/downloads/agent.json"))
        .call()
        .map_err(|e| format!("update check failed: {e}"))?
        .body_mut()
        .read_json()
        .map_err(|e| format!("update check failed: {e}"))?;
    if !is_newer(&manifest.version, VERSION) {
        return Ok(None);
    }
    log(&format!("Update {} available (running {VERSION}), downloading", manifest.version));
    let dir = std::env::temp_dir().join("ScanAndPrint-update");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let dest = dir.join(install::EXE_NAME);
    download_verified(&absolute(server, &manifest.url), &dest, &manifest.sha256)?;
    Ok(Some(dest))
}

/// Starts the downloaded installer; it waits for this process to exit, then replaces the exe.
pub fn apply(new_exe: &Path) -> Result<(), String> {
    log(&format!("Installing update from {}", new_exe.display()));
    std::process::Command::new(new_exe).arg("install").spawn().map(|_| ()).map_err(|e| e.to_string())
}

/// Compares dotted version numbers ("0.10.0" > "0.9.3").
fn is_newer(candidate: &str, current: &str) -> bool {
    let parse = |v: &str| v.split('.').map(|p| p.parse::<u64>().unwrap_or(0)).collect::<Vec<_>>();
    parse(candidate) > parse(current)
}

#[cfg(test)]
mod tests {
    #[test]
    fn version_compare() {
        assert!(super::is_newer("0.10.0", "0.9.3"));
        assert!(super::is_newer("1.0.0", "0.99.0"));
        assert!(!super::is_newer("0.2.0", "0.2.0"));
        assert!(!super::is_newer("0.1.9", "0.2.0"));
    }
}
