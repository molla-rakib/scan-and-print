//! Per-user install, update and uninstall. The downloaded exe is its own installer: run from anywhere
//! else, it copies itself to `%LOCALAPPDATA%\Programs\Mudron`, adds shortcuts and an entry in
//! Windows "Installed apps", and starts the installed copy. No admin rights are needed, which also
//! lets auto-update replace the exe silently.

use std::{
    fs,
    os::windows::process::CommandExt,
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::{Duration, Instant},
};

use windows::Win32::Foundation::ERROR_SUCCESS;
use windows::Win32::System::Com::{CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED, CoCreateInstance, CoInitializeEx, CoTaskMemFree, IPersistFile};
use windows::Win32::System::Registry::{HKEY_CURRENT_USER, REG_DWORD, REG_SZ, RegDeleteTreeW, RegSetKeyValueW};
use windows::Win32::UI::Shell::{FOLDERID_Desktop, FOLDERID_Programs, IShellLinkW, KF_FLAG_DEFAULT, SHGetKnownFolderPath, ShellLink};
use windows::core::{HSTRING, Interface, PCWSTR, w};

use crate::{VERSION, config, icon, log::log, system};

pub const EXE_NAME: &str = "Mudron.exe";
const CREATE_NO_WINDOW: u32 = 0x0800_0000;
const APP_NAME: &str = "Mudron Agent";
const SHORTCUT: &str = "Mudron.lnk";
const UNINSTALL_KEY: PCWSTR = w!("Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Mudron");

/// What agents up to 1.2.0 used, before everything was renamed to Mudron. Installing over such an agent
/// moves its saved connection across and removes the rest (`retire_legacy_install`).
const LEGACY_SHORTCUT: &str = "Scan & Print.lnk";
const LEGACY_FOLDER: &str = "ScanAndPrint";
const LEGACY_UNINSTALL_KEY: PCWSTR = w!("Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ScanAndPrintAgent");
const LEGACY_SERVER: &str = "https://scan-and-print.vercel.app";

fn programs_dir() -> PathBuf {
    let base = std::env::var_os("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(std::env::temp_dir);
    base.join("Programs")
}

pub fn install_dir() -> PathBuf {
    programs_dir().join("Mudron")
}

/// Stops a pre-rename agent and takes over its saved connection (pointed at the new server if it used the
/// old one), then removes its install folder, data, uninstall entry and start-with-Windows entry.
/// Returns whether the old agent started with Windows.
fn retire_legacy_install() -> Result<bool, String> {
    if !system::quit_legacy_instance(Duration::from_secs(60)) {
        return Err("the old ScanAndPrint agent did not close".into());
    }
    let legacy_data = config::data_dir().with_file_name(LEGACY_FOLDER);
    let legacy_config = legacy_data.join("agent.json");
    if legacy_config.exists() && !config::data_dir().join("agent.json").exists() {
        let _ = fs::create_dir_all(config::data_dir());
        match fs::copy(&legacy_config, config::data_dir().join("agent.json")) {
            Ok(_) => log("Moved the saved connection from the old ScanAndPrint agent"),
            Err(e) => log(&format!("Could not move the old saved connection: {e}")),
        }
        if let Ok(Some(mut saved)) = config::load()
            && saved.server.trim_end_matches('/') == LEGACY_SERVER
        {
            saved.server = crate::default_server();
            let _ = config::save(&saved);
        }
    }
    let _ = fs::remove_dir_all(&legacy_data);
    let _ = fs::remove_dir_all(std::env::temp_dir().join(LEGACY_FOLDER));
    let _ = fs::remove_dir_all(programs_dir().join(LEGACY_FOLDER));
    unsafe {
        let _ = RegDeleteTreeW(HKEY_CURRENT_USER, LEGACY_UNINSTALL_KEY);
    }
    Ok(system::remove_legacy_autostart())
}

pub fn installed_exe() -> PathBuf {
    install_dir().join(EXE_NAME)
}

/// Whether this process is the installed copy.
pub fn is_installed_copy() -> bool {
    let Ok(exe) = std::env::current_exe() else { return false };
    same_path(&exe, &installed_exe())
}

fn same_path(a: &Path, b: &Path) -> bool {
    match (a.canonicalize(), b.canonicalize()) {
        (Ok(a), Ok(b)) => a == b,
        _ => a.to_string_lossy().eq_ignore_ascii_case(&b.to_string_lossy()),
    }
}

/// Installs (or updates) from the running exe, then starts the installed tray app.
pub fn install() -> Result<(), String> {
    let source = std::env::current_exe().map_err(|e| e.to_string())?;
    if same_path(&source, &installed_exe()) {
        return Err("already running from the install folder".into());
    }
    log(&format!("Installing version {VERSION} to {}", install_dir().display()));

    // A running copy (old version, or the one that started this update) must exit first.
    system::request_quit();
    if !system::wait_for_instance_exit(Duration::from_secs(60)) {
        return Err("the running agent did not close".into());
    }
    let legacy_autostart = retire_legacy_install()?;

    let dir = install_dir();
    fs::create_dir_all(&dir).map_err(|e| format!("cannot create {}: {e}", dir.display()))?;
    copy_with_retry(&source, &installed_exe())?;
    let ico = dir.join("app.ico");
    let _ = fs::write(&ico, icon::ico(&[16, 24, 32, 48, 64, 256]));

    register_uninstall(&dir);
    for folder in [&FOLDERID_Programs, &FOLDERID_Desktop] {
        if let Some(folder) = known_folder(folder) {
            let _ = fs::remove_file(folder.join(LEGACY_SHORTCUT));
            if let Err(e) = create_shortcut(&folder.join(SHORTCUT), &installed_exe(), &ico) {
                log(&format!("Could not create shortcut in {}: {e}", folder.display()));
            }
        }
    }
    // Keep "start with Windows" pointing at the installed copy if it was on.
    if legacy_autostart || system::autostart_registered() {
        let _ = system::set_autostart_for(&installed_exe(), true);
    }

    Command::new(installed_exe()).current_dir(&dir).spawn().map_err(|e| format!("cannot start the agent: {e}"))?;
    log("Install finished");
    Ok(())
}

/// Removes everything: the running agent, shortcuts, start-with-Windows, the saved connection and logs,
/// the "Installed apps" entry and the install folder.
pub fn uninstall() -> Result<(), String> {
    system::request_quit();
    system::wait_for_instance_exit(Duration::from_secs(30));

    let _ = system::set_autostart_for(&installed_exe(), false);
    for folder in [&FOLDERID_Programs, &FOLDERID_Desktop] {
        if let Some(folder) = known_folder(folder) {
            let _ = fs::remove_file(folder.join(SHORTCUT));
            let _ = fs::remove_file(folder.join(LEGACY_SHORTCUT));
        }
    }
    unsafe {
        let _ = RegDeleteTreeW(HKEY_CURRENT_USER, UNINSTALL_KEY);
    }
    let _ = config::delete();
    let _ = fs::remove_dir_all(config::data_dir());
    let _ = fs::remove_dir_all(std::env::temp_dir().join("Mudron"));

    // This exe may be the installed one and cannot delete itself while running (it still shows the
    // "removed" message), so a hidden PowerShell waits for this process to exit, then deletes the folder.
    let dir = install_dir();
    if dir.exists() {
        let script = format!(
            "Wait-Process -Id {} -ErrorAction SilentlyContinue; Start-Sleep -Seconds 1; Remove-Item -LiteralPath '{}' -Recurse -Force",
            std::process::id(),
            dir.display().to_string().replace('\'', "''")
        );
        Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", &script])
            .current_dir(std::env::temp_dir())
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn copy_with_retry(from: &Path, to: &Path) -> Result<(), String> {
    let started = Instant::now();
    loop {
        match fs::copy(from, to) {
            Ok(_) => return Ok(()),
            // The old exe can stay locked for a moment after its process exits.
            Err(_) if started.elapsed() < Duration::from_secs(20) => thread::sleep(Duration::from_millis(500)),
            Err(e) => return Err(format!("cannot copy the agent to {}: {e}", to.display())),
        }
    }
}

fn register_uninstall(dir: &Path) {
    let exe = installed_exe();
    let strings = [
        (w!("DisplayName"), APP_NAME.to_string()),
        (w!("DisplayVersion"), VERSION.to_string()),
        (w!("Publisher"), "Mudron".to_string()),
        (w!("DisplayIcon"), dir.join("app.ico").display().to_string()),
        (w!("InstallLocation"), dir.display().to_string()),
        (w!("UninstallString"), format!("\"{}\" uninstall", exe.display())),
    ];
    unsafe {
        for (name, value) in strings {
            let wide: Vec<u16> = value.encode_utf16().chain(Some(0)).collect();
            let r = RegSetKeyValueW(HKEY_CURRENT_USER, UNINSTALL_KEY, name, REG_SZ.0, Some(wide.as_ptr().cast()), (wide.len() * 2) as u32);
            if r != ERROR_SUCCESS {
                log(&format!("Could not write the uninstall entry (error {})", r.0));
                return;
            }
        }
        let size_kb = fs::metadata(&exe).map(|m| (m.len() / 1024) as u32).unwrap_or(0);
        for (name, value) in [(w!("NoModify"), 1u32), (w!("NoRepair"), 1u32), (w!("EstimatedSize"), size_kb)] {
            let _ = RegSetKeyValueW(HKEY_CURRENT_USER, UNINSTALL_KEY, name, REG_DWORD.0, Some((&value as *const u32).cast()), 4);
        }
    }
}

fn known_folder(id: &windows::core::GUID) -> Option<PathBuf> {
    unsafe {
        let path = SHGetKnownFolderPath(id, KF_FLAG_DEFAULT, None).ok()?;
        let result = path.to_string().ok().map(PathBuf::from);
        CoTaskMemFree(Some(path.0 as _));
        result
    }
}

fn create_shortcut(lnk: &Path, target: &Path, icon: &Path) -> windows::core::Result<()> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)?;
        link.SetPath(&HSTRING::from(target.as_os_str()))?;
        if let Some(dir) = target.parent() {
            link.SetWorkingDirectory(&HSTRING::from(dir.as_os_str()))?;
        }
        link.SetDescription(&HSTRING::from(APP_NAME))?;
        link.SetIconLocation(&HSTRING::from(icon.as_os_str()), 0)?;
        link.cast::<IPersistFile>()?.Save(&HSTRING::from(lnk.as_os_str()), true)
    }
}
