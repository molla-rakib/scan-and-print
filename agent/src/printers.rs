//! Lists the Windows printers installed on this PC and their capabilities.

use windows::Win32::Graphics::Printing::{
    EnumPrintersW, PRINTER_ATTRIBUTE_WORK_OFFLINE, PRINTER_ENUM_CONNECTIONS, PRINTER_ENUM_LOCAL, PRINTER_INFO_2W,
};
use windows::Win32::Storage::Xps::{DC_COLORDEVICE, DC_DUPLEX, DC_PAPERS, DeviceCapabilitiesW};
use windows::core::{PCWSTR, PWSTR};

pub struct Printer {
    pub name: String,
    pub port: String,
    pub driver: String,
    pub color: bool,
    pub duplex: bool,
    /// Which of the paper sizes customers can order ("A4", "Legal", "A3") the driver supports.
    pub paper_sizes: Vec<&'static str>,
    /// One of idle, printing, offline, paused, paper_out, paper_jam, no_toner, door_open, error.
    pub state: &'static str,
    /// Why the printer is not offered to the server (fax, "print to file" style printers), if it isn't.
    pub skip_reason: Option<&'static str>,
}

// PRINTER_STATUS_* flags from winspool.h.
const STATUS_PAUSED: u32 = 0x1;
const STATUS_ERROR: u32 = 0x2;
const STATUS_PAPER_JAM: u32 = 0x8;
const STATUS_PAPER_OUT: u32 = 0x10;
const STATUS_OFFLINE: u32 = 0x80;
const STATUS_BUSY: u32 = 0x200;
const STATUS_PRINTING: u32 = 0x400;
const STATUS_NO_TONER: u32 = 0x40000;
const STATUS_USER_INTERVENTION: u32 = 0x100000;
const STATUS_DOOR_OPEN: u32 = 0x400000;

pub fn list() -> windows::core::Result<Vec<Printer>> {
    let flags = PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS;
    let mut needed = 0u32;
    let mut count = 0u32;
    unsafe {
        // First call only asks for the buffer size; it "fails" with ERROR_INSUFFICIENT_BUFFER.
        let _ = EnumPrintersW(flags, PCWSTR::null(), 2, None, &mut needed, &mut count);
        if needed == 0 {
            return Ok(Vec::new());
        }
        // u64 storage keeps the buffer aligned for PRINTER_INFO_2W.
        let mut storage = vec![0u64; (needed as usize).div_ceil(8)];
        let buffer = std::slice::from_raw_parts_mut(storage.as_mut_ptr() as *mut u8, needed as usize);
        EnumPrintersW(flags, PCWSTR::null(), 2, Some(buffer), &mut needed, &mut count)?;
        let infos = std::slice::from_raw_parts(storage.as_ptr() as *const PRINTER_INFO_2W, count as usize);
        Ok(infos.iter().map(|info| describe(info)).collect())
    }
}

unsafe fn describe(info: &PRINTER_INFO_2W) -> Printer {
    let name = unsafe { pwstr(info.pPrinterName) };
    let port = unsafe { pwstr(info.pPortName) };
    let driver = unsafe { pwstr(info.pDriverName) };
    let capability = |cap| unsafe { DeviceCapabilitiesW(PCWSTR(info.pPrinterName.0), PCWSTR(info.pPortName.0), cap, None, None) };

    let offline = info.Status & STATUS_OFFLINE != 0 || info.Attributes & PRINTER_ATTRIBUTE_WORK_OFFLINE != 0;
    let state = if offline {
        "offline"
    } else if info.Status & STATUS_PAPER_OUT != 0 {
        "paper_out"
    } else if info.Status & STATUS_PAPER_JAM != 0 {
        "paper_jam"
    } else if info.Status & STATUS_NO_TONER != 0 {
        "no_toner"
    } else if info.Status & STATUS_DOOR_OPEN != 0 {
        "door_open"
    } else if info.Status & STATUS_PAUSED != 0 {
        "paused"
    } else if info.Status & (STATUS_ERROR | STATUS_USER_INTERVENTION) != 0 {
        "error"
    } else if info.Status & (STATUS_PRINTING | STATUS_BUSY) != 0 {
        "printing"
    } else {
        "idle"
    };

    let skip_reason = skip_reason(&name, &port, &driver);
    Printer {
        color: capability(DC_COLORDEVICE) == 1,
        duplex: capability(DC_DUPLEX) == 1,
        paper_sizes: unsafe { paper_sizes(info) },
        name,
        port,
        driver,
        state,
        skip_reason,
    }
}

/// DMPAPER_* ids (wingdi.h) of the sizes the server knows.
const PAPER_IDS: [(u16, &str); 3] = [(9, "A4"), (5, "Legal"), (8, "A3")];

unsafe fn paper_sizes(info: &PRINTER_INFO_2W) -> Vec<&'static str> {
    let (device, port) = (PCWSTR(info.pPrinterName.0), PCWSTR(info.pPortName.0));
    // First call returns how many papers there are, the second fills the list of ids.
    let count = unsafe { DeviceCapabilitiesW(device, port, DC_PAPERS, None, None) };
    if count <= 0 {
        return Vec::new();
    }
    let mut ids = vec![0u16; count as usize];
    let written = unsafe { DeviceCapabilitiesW(device, port, DC_PAPERS, Some(PWSTR(ids.as_mut_ptr())), None) };
    if written <= 0 {
        return Vec::new();
    }
    ids.truncate(written as usize);
    PAPER_IDS.iter().filter(|(id, _)| ids.contains(id)).map(|(_, name)| *name).collect()
}

/// Printers that cannot print a customer job unattended.
fn skip_reason(name: &str, port: &str, driver: &str) -> Option<&'static str> {
    let port = port.to_ascii_uppercase();
    let lower = format!("{name} {driver}").to_ascii_lowercase();
    if port.starts_with("SHRFAX") || lower.contains("fax") {
        Some("fax")
    } else if port == "PORTPROMPT:" || port == "FILE:" || lower.contains("onenote") {
        Some("asks for a file name instead of printing on paper")
    } else {
        None
    }
}

unsafe fn pwstr(p: PWSTR) -> String {
    if p.is_null() { String::new() } else { unsafe { p.to_string().unwrap_or_default() } }
}
