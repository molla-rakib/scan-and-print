//! Small Windows helpers: start with Windows, single instance, asking a running copy to quit, opening
//! links, sounds.

use std::{
    path::Path,
    thread,
    time::{Duration, Instant},
};

use windows::Win32::Foundation::{CloseHandle, ERROR_ALREADY_EXISTS, ERROR_SUCCESS, GetLastError, HANDLE, WAIT_OBJECT_0};
use windows::Win32::System::Registry::{HKEY_CURRENT_USER, REG_SZ, RRF_RT_REG_SZ, RegDeleteKeyValueW, RegGetValueW, RegSetKeyValueW};
use windows::Win32::System::Threading::{CreateEventW, CreateMutexW, EVENT_MODIFY_STATE, INFINITE, OpenEventW, SetEvent, WaitForSingleObject};
use windows::Win32::UI::Shell::ShellExecuteW;
use windows::Win32::UI::WindowsAndMessaging::{MB_ICONERROR, MB_ICONINFORMATION, MB_OK, MessageBoxW, SW_SHOWNORMAL};
use windows::core::{HSTRING, PCWSTR, w};

const RUN_KEY: PCWSTR = w!("Software\\Microsoft\\Windows\\CurrentVersion\\Run");
const RUN_VALUE: PCWSTR = w!("ScanAndPrintAgent");
const MUTEX_NAME: PCWSTR = w!("Local\\ScanAndPrintAgent");
const QUIT_EVENT: PCWSTR = w!("Local\\ScanAndPrintAgentQuit");
const SHOW_EVENT: PCWSTR = w!("Local\\ScanAndPrintAgentShow");

/// Holds the named mutex for as long as the process runs.
pub struct SingleInstance(#[allow(dead_code)] HANDLE);

/// Returns None if another copy of the agent is already running for this Windows user.
pub fn single_instance() -> Option<SingleInstance> {
    unsafe {
        let handle = CreateMutexW(None, false, MUTEX_NAME).ok()?;
        if GetLastError() == ERROR_ALREADY_EXISTS {
            let _ = CloseHandle(handle);
            None
        } else {
            Some(SingleInstance(handle))
        }
    }
}

/// Waits until no copy of the agent is running. Returns false on timeout.
pub fn wait_for_instance_exit(timeout: Duration) -> bool {
    let started = Instant::now();
    loop {
        if let Some(instance) = single_instance() {
            unsafe {
                let _ = CloseHandle(instance.0);
            }
            return true;
        }
        if started.elapsed() > timeout {
            return false;
        }
        thread::sleep(Duration::from_millis(300));
    }
}

fn signal(name: PCWSTR) {
    unsafe {
        if let Ok(event) = OpenEventW(EVENT_MODIFY_STATE, false, name) {
            let _ = SetEvent(event);
            let _ = CloseHandle(event);
        }
    }
}

/// Calls `callback` on a background thread each time another process signals the named event.
fn on_signal(name: PCWSTR, callback: impl Fn() + Send + 'static) {
    let Ok(event) = (unsafe { CreateEventW(None, false, false, name) }) else { return };
    let event = event.0 as usize; // HANDLE is not Send; the raw value is fine to move.
    thread::spawn(move || {
        while unsafe { WaitForSingleObject(HANDLE(event as _), INFINITE) } == WAIT_OBJECT_0 {
            callback();
        }
    });
}

/// Asks a running tray app to quit (used by install, update and uninstall).
pub fn request_quit() {
    signal(QUIT_EVENT);
}

pub fn on_quit_request(callback: impl Fn() + Send + 'static) {
    on_signal(QUIT_EVENT, callback);
}

/// Asks a running tray app to show itself (the shortcut was clicked while it runs).
pub fn signal_show() {
    signal(SHOW_EVENT);
}

pub fn on_show_request(callback: impl Fn() + Send + 'static) {
    on_signal(SHOW_EVENT, callback);
}

fn autostart_command_for(exe: &Path) -> String {
    format!("\"{}\"", exe.display())
}

fn autostart_value() -> Option<String> {
    let mut buffer = [0u16; 1024];
    let mut size = (buffer.len() * 2) as u32;
    let result = unsafe {
        RegGetValueW(HKEY_CURRENT_USER, RUN_KEY, RUN_VALUE, RRF_RT_REG_SZ, None, Some(buffer.as_mut_ptr().cast()), Some(&mut size))
    };
    if result != ERROR_SUCCESS {
        return None;
    }
    let len = (size as usize / 2).saturating_sub(1);
    Some(String::from_utf16_lossy(&buffer[..len]))
}

/// Whether Windows starts *this* exe at login.
pub fn autostart_enabled() -> bool {
    let Ok(exe) = std::env::current_exe() else { return false };
    autostart_value().is_some_and(|v| v.eq_ignore_ascii_case(&autostart_command_for(&exe)))
}

/// Whether any copy of the agent is set to start at login.
pub fn autostart_registered() -> bool {
    autostart_value().is_some()
}

pub fn set_autostart(enabled: bool) -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    set_autostart_for(&exe, enabled)
}

pub fn set_autostart_for(exe: &Path, enabled: bool) -> Result<(), String> {
    let result = unsafe {
        if enabled {
            let wide: Vec<u16> = autostart_command_for(exe).encode_utf16().chain(Some(0)).collect();
            RegSetKeyValueW(HKEY_CURRENT_USER, RUN_KEY, RUN_VALUE, REG_SZ.0, Some(wide.as_ptr().cast()), (wide.len() * 2) as u32)
        } else {
            let r = RegDeleteKeyValueW(HKEY_CURRENT_USER, RUN_KEY, RUN_VALUE);
            if r.0 == 2 { ERROR_SUCCESS } else { r } // ERROR_FILE_NOT_FOUND: already off
        }
    };
    if result == ERROR_SUCCESS { Ok(()) } else { Err(format!("registry error {}", result.0)) }
}

/// Opens a URL in the default browser or a file in its default program.
pub fn open(target: &str) {
    unsafe {
        ShellExecuteW(None, w!("open"), &HSTRING::from(target), PCWSTR::null(), PCWSTR::null(), SW_SHOWNORMAL);
    }
}


/// A plain Windows message box, for the installer and errors before the tray exists.
pub fn message(text: &str, error: bool) {
    let icon = if error { MB_ICONERROR } else { MB_ICONINFORMATION };
    unsafe {
        MessageBoxW(None, &HSTRING::from(text), w!("Mudron"), MB_OK | icon);
    }
}
