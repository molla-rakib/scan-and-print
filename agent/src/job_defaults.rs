//! Makes "both sides" stick on printer drivers that ignore it.
//!
//! SumatraPDF asks for both sides only through the standard `dmDuplex` field of the printer's DEVMODE. Many
//! drivers (copier and HP/Canon/Konica style drivers in particular) keep the real setting in their private part
//! of the DEVMODE and print one-sided whatever `dmDuplex` says. So before a both-sides job we let the driver build
//! the settings itself from a PrintTicket, the way the Windows print dialog does, and make them the printer's
//! per-user default while SumatraPDF prints: SumatraPDF starts from that default. Afterwards the old default is
//! put back. A copy of it is kept on disk until then, so a crash or power cut mid-print can't leave the shop's
//! printer printing both sides for everything (see [`restore_after_crash`]).

use std::{fs, path::PathBuf};

use windows::Win32::Foundation::HGLOBAL;
use windows::Win32::Graphics::Gdi::{DEVMODEA, DEVMODEW, DM_DUPLEX, DM_IN_BUFFER, DM_OUT_BUFFER, DM_PAPERLENGTH, DM_PAPERSIZE, DM_PAPERWIDTH, DMDUP_SIMPLEX, DMDUP_VERTICAL};
use windows::Win32::Graphics::Printing::PrintTicket::{
    HPTPROVIDER, PTCloseProvider, PTConvertDevModeToPrintTicket, PTConvertPrintTicketToDevMode, PTMergeAndValidatePrintTicket,
    PTOpenProvider, PTReleaseMemory, kPTJobScope, kUserDefaultDevmode,
};
use windows::Win32::Graphics::Printing::{ClosePrinter, DocumentPropertiesW, OpenPrinterW, PRINTER_HANDLE, PRINTER_INFO_9W, SetPrinterW};
use windows::Win32::System::Com::StructuredStorage::CreateStreamOnHGlobal;
use windows::Win32::System::Com::{COINIT_MULTITHREADED, CoInitializeEx, CoUninitialize, IStream, STATFLAG_NONAME, STATSTG, STREAM_SEEK_SET};
use windows::core::{HSTRING, PCWSTR};

use crate::log::log;

/// Asks for both sides, flipped on the long edge; the driver fills in everything else.
const DUPLEX_TICKET: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<psf:PrintTicket xmlns:psf="http://schemas.microsoft.com/windows/2003/08/printing/printschemaframework" xmlns:psk="http://schemas.microsoft.com/windows/2003/08/printing/printschemakeywords" version="1">
  <psf:Feature name="psk:JobDuplexAllDocumentsContiguously"><psf:Option name="psk:TwoSidedLongEdge"/></psf:Feature>
</psf:PrintTicket>"#;

/// Puts the printer's previous default back when dropped.
pub struct Override {
    printer: String,
    original: DevMode,
}

impl Drop for Override {
    fn drop(&mut self) {
        match set_user_default(&self.printer, &self.original) {
            Ok(()) => {
                let _ = fs::remove_file(backup_path());
            }
            Err(e) => log(&format!("  could not restore the printer's default settings: {e}")),
        }
    }
}

/// Makes both sides on `paper_id` paper the default of `printer` until the returned value is dropped. Returns
/// None, after logging why, when the driver can't be asked; SumatraPDF's own setting is then all there is.
pub fn both_sides(printer: &str, paper_id: u16) -> Option<Override> {
    match try_both_sides(printer, paper_id) {
        Ok(guard) => Some(guard),
        Err(e) => {
            log(&format!("  could not prepare both-sides settings with the driver: {e}"));
            None
        }
    }
}

fn try_both_sides(printer: &str, paper_id: u16) -> Result<Override, String> {
    let handle = Printer::open(printer)?;
    let original = handle.user_default()?;

    // The standard fields first, checked by the driver, then the driver's own reading of a "both sides" ticket.
    let mut wanted = original.clone();
    {
        let dm = wanted.as_mut();
        dm.Anonymous1.Anonymous1.dmPaperSize = paper_id as i16;
        dm.dmDuplex = DMDUP_VERTICAL;
        dm.dmFields = (dm.dmFields | DM_PAPERSIZE | DM_DUPLEX) & !(DM_PAPERLENGTH | DM_PAPERWIDTH);
    }
    let checked = handle.validate(&wanted)?;
    let (devmode, sides) = with_com(|| ticket_both_sides(printer, &checked))?;
    log(&format!("  driver settings for both sides: {sides}"));
    if devmode.as_ref().dmDuplex == DMDUP_SIMPLEX || devmode.as_ref().dmDuplex.0 == 0 {
        return Err(format!("the driver turned both sides off ({sides})"));
    }

    save_backup(printer, &original)?;
    if let Err(e) = set_user_default(printer, &devmode) {
        let _ = fs::remove_file(backup_path());
        return Err(e);
    }
    Ok(Override { printer: printer.to_string(), original })
}

/// Puts back a default left behind by a print that never finished (agent killed, PC switched off).
pub fn restore_after_crash() {
    let Ok(data) = fs::read(backup_path()) else { return };
    let parsed = (|| {
        let len = u32::from_le_bytes(data.get(..4)?.try_into().ok()?) as usize;
        let name = String::from_utf8(data.get(4..4 + len)?.to_vec()).ok()?;
        Some((name, DevMode::from_bytes(data.get(4 + len..)?)?))
    })();
    match parsed {
        Some((printer, devmode)) => match set_user_default(&printer, &devmode) {
            Ok(()) => log(&format!("Restored the default settings of {printer} after an unfinished print")),
            Err(e) => {
                log(&format!("Could not restore the default settings of {printer}: {e}"));
                return; // try again next start
            }
        },
        None => log("Ignoring an unreadable printer settings backup"),
    }
    let _ = fs::remove_file(backup_path());
}

fn backup_path() -> PathBuf {
    crate::config::data_dir().join("printer-default.bin")
}

fn save_backup(printer: &str, devmode: &DevMode) -> Result<(), String> {
    let mut data = (printer.len() as u32).to_le_bytes().to_vec();
    data.extend_from_slice(printer.as_bytes());
    data.extend_from_slice(devmode.bytes());
    let path = backup_path();
    if let Some(dir) = path.parent() {
        let _ = fs::create_dir_all(dir);
    }
    fs::write(&path, data).map_err(|e| format!("cannot save a backup of the printer settings: {e}"))
}

fn set_user_default(printer: &str, devmode: &DevMode) -> Result<(), String> {
    let handle = Printer::open(printer)?;
    let mut devmode = devmode.clone();
    let info = PRINTER_INFO_9W { pDevMode: devmode.as_mut() };
    unsafe { SetPrinterW(handle.handle, 9, Some(&info as *const PRINTER_INFO_9W as *const u8), 0) }
        .map_err(|e| format!("SetPrinter: {e}"))
}

/// The driver's DEVMODE for `base` plus "both sides", and the both-sides option the driver settled on.
fn ticket_both_sides(printer: &str, base: &DevMode) -> Result<(DevMode, String), String> {
    let provider = Provider(unsafe { PTOpenProvider(&HSTRING::from(printer), 1) }.map_err(|e| format!("PTOpenProvider: {e}"))?);
    let base_ticket = new_stream()?;
    unsafe {
        PTConvertDevModeToPrintTicket(provider.0, base.len() as u32, base.as_ptr() as *const DEVMODEA, kPTJobScope, &base_ticket)
            .map_err(|e| format!("PTConvertDevModeToPrintTicket: {e}"))?;
    }
    rewind(&base_ticket)?;
    let delta = new_stream()?;
    write_all(&delta, DUPLEX_TICKET.as_bytes())?;
    rewind(&delta)?;
    let merged = new_stream()?;
    unsafe {
        PTMergeAndValidatePrintTicket(provider.0, &base_ticket, &delta, kPTJobScope, &merged, None)
            .map_err(|e| format!("PTMergeAndValidatePrintTicket: {e}"))?;
    }
    rewind(&merged)?;
    let sides = duplex_option(&String::from_utf8_lossy(&read_all(&merged)?));
    rewind(&merged)?;

    let mut size = 0u32;
    let mut out: *mut DEVMODEA = std::ptr::null_mut();
    unsafe {
        PTConvertPrintTicketToDevMode(provider.0, &merged, kUserDefaultDevmode, kPTJobScope, &mut size, &mut out, None)
            .map_err(|e| format!("PTConvertPrintTicketToDevMode: {e}"))?;
    }
    // The API is declared with DEVMODEA but works with the Unicode DEVMODEW.
    let bytes = unsafe { std::slice::from_raw_parts(out as *const u8, size as usize) }.to_vec();
    unsafe {
        let _ = PTReleaseMemory(out as *const _);
    }
    let devmode = DevMode::from_bytes(&bytes).ok_or("the driver returned unusable settings")?;
    Ok((devmode, sides))
}

/// The option the merged ticket chose for JobDuplexAllDocumentsContiguously, e.g. "TwoSidedLongEdge".
fn duplex_option(ticket: &str) -> String {
    let Some(start) = ticket.find("JobDuplexAllDocumentsContiguously") else {
        return "driver has no both-sides setting".into();
    };
    let rest = &ticket[start..];
    let Some(option) = rest.find("Option name=\"") else { return "unknown".into() };
    let value = &rest[option + 13..];
    let value = &value[..value.find('"').unwrap_or(value.len())];
    value.rsplit(':').next().unwrap_or(value).to_string()
}

fn with_com<T>(f: impl FnOnce() -> T) -> T {
    // PrintTicket calls need COM on this thread. S_FALSE and RPC_E_CHANGED_MODE both mean it already is.
    let hr = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
    let result = f();
    if hr.is_ok() {
        unsafe { CoUninitialize() };
    }
    result
}

struct Provider(HPTPROVIDER);

impl Drop for Provider {
    fn drop(&mut self) {
        let _ = unsafe { PTCloseProvider(self.0) };
    }
}

fn new_stream() -> Result<IStream, String> {
    unsafe { CreateStreamOnHGlobal(HGLOBAL::default(), true) }.map_err(|e| format!("CreateStreamOnHGlobal: {e}"))
}

fn rewind(stream: &IStream) -> Result<(), String> {
    unsafe { stream.Seek(0, STREAM_SEEK_SET, None) }.map_err(|e| format!("IStream::Seek: {e}"))
}

fn write_all(stream: &IStream, data: &[u8]) -> Result<(), String> {
    let mut written = 0u32;
    unsafe { stream.Write(data.as_ptr() as *const _, data.len() as u32, Some(&mut written)) }
        .ok()
        .map_err(|e| format!("IStream::Write: {e}"))?;
    if written as usize != data.len() {
        return Err("IStream::Write was short".into());
    }
    Ok(())
}

fn read_all(stream: &IStream) -> Result<Vec<u8>, String> {
    let mut stat = STATSTG::default();
    unsafe { stream.Stat(&mut stat, STATFLAG_NONAME) }.map_err(|e| format!("IStream::Stat: {e}"))?;
    let mut data = vec![0u8; stat.cbSize as usize];
    let mut read = 0u32;
    unsafe { stream.Read(data.as_mut_ptr() as *mut _, data.len() as u32, Some(&mut read)) }
        .ok()
        .map_err(|e| format!("IStream::Read: {e}"))?;
    data.truncate(read as usize);
    Ok(data)
}

/// An open printer handle, closed on drop.
struct Printer {
    handle: PRINTER_HANDLE,
    name: HSTRING,
}

impl Printer {
    fn open(name: &str) -> Result<Self, String> {
        let name = HSTRING::from(name);
        let mut handle = PRINTER_HANDLE::default();
        unsafe { OpenPrinterW(PCWSTR(name.as_ptr()), &mut handle, None) }.map_err(|e| format!("OpenPrinter: {e}"))?;
        Ok(Self { handle, name })
    }

    fn devmode_size(&self) -> Result<usize, String> {
        let size = unsafe { DocumentPropertiesW(None, self.handle, PCWSTR(self.name.as_ptr()), None, None, 0) };
        if size <= 0 { Err("DocumentProperties gave no size".into()) } else { Ok(size as usize) }
    }

    /// The settings new print jobs start from (the user's printing preferences).
    fn user_default(&self) -> Result<DevMode, String> {
        let mut out = DevMode::zeroed(self.devmode_size()?);
        let ok = unsafe { DocumentPropertiesW(None, self.handle, PCWSTR(self.name.as_ptr()), Some(out.as_mut()), None, DM_OUT_BUFFER.0) };
        if ok < 0 {
            return Err("DocumentProperties could not read the defaults".into());
        }
        out.fit()
    }

    /// `input` as the driver accepts it, with the private part brought in line with the standard fields.
    fn validate(&self, input: &DevMode) -> Result<DevMode, String> {
        let mut input = input.clone();
        let mut out = DevMode::zeroed(self.devmode_size()?);
        let ok = unsafe {
            DocumentPropertiesW(None, self.handle, PCWSTR(self.name.as_ptr()), Some(out.as_mut()), Some(input.as_mut()), (DM_IN_BUFFER | DM_OUT_BUFFER).0)
        };
        if ok < 0 {
            return Err("DocumentProperties rejected the settings".into());
        }
        out.fit()
    }
}

impl Drop for Printer {
    fn drop(&mut self) {
        let _ = unsafe { ClosePrinter(self.handle) };
    }
}

/// A DEVMODEW followed by the driver's private data, in u64 storage so the struct is aligned.
#[derive(Clone)]
struct DevMode {
    storage: Vec<u64>,
    len: usize,
}

impl DevMode {
    fn zeroed(len: usize) -> Self {
        let len = len.max(std::mem::size_of::<DEVMODEW>());
        Self { storage: vec![0; len.div_ceil(8)], len }
    }

    fn from_bytes(bytes: &[u8]) -> Option<Self> {
        // Storage is at least a whole DEVMODEW even when the driver's struct is an older, shorter one.
        let mut out = Self::zeroed(bytes.len());
        unsafe { std::ptr::copy_nonoverlapping(bytes.as_ptr(), out.storage.as_mut_ptr() as *mut u8, bytes.len()) };
        out.len = bytes.len();
        out.fit().ok()
    }

    /// Trims `len` to what the struct says it holds (dmSize + dmDriverExtra).
    fn fit(mut self) -> Result<Self, String> {
        let dm = self.as_ref();
        let real = dm.dmSize as usize + dm.dmDriverExtra as usize;
        if real < 64 || real > self.len {
            return Err("the driver returned settings of an unexpected size".into());
        }
        self.len = real;
        Ok(self)
    }

    fn len(&self) -> usize {
        self.len
    }

    fn bytes(&self) -> &[u8] {
        unsafe { std::slice::from_raw_parts(self.storage.as_ptr() as *const u8, self.len) }
    }

    fn as_ptr(&self) -> *const DEVMODEW {
        self.storage.as_ptr() as *const DEVMODEW
    }

    fn as_ref(&self) -> &DEVMODEW {
        unsafe { &*self.as_ptr() }
    }

    fn as_mut(&mut self) -> &mut DEVMODEW {
        unsafe { &mut *(self.storage.as_mut_ptr() as *mut DEVMODEW) }
    }
}
