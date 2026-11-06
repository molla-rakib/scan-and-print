//! Saved pairing state: `%APPDATA%\ScanAndPrint\agent.json`.
//! The bearer token is encrypted with Windows DPAPI, so it is only readable by the same Windows user.

use std::{fs, io, path::PathBuf};

use serde::{Deserialize, Serialize};
use windows::Win32::Foundation::{HLOCAL, LocalFree};
use windows::Win32::Security::Cryptography::{
    CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN, CryptProtectData, CryptUnprotectData,
};
use windows::core::w;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Stored {
    server: String,
    agent_id: String,
    shop_name: String,
    /// DPAPI-encrypted token, hex encoded.
    token: String,
}

pub struct Config {
    pub server: String,
    pub agent_id: String,
    pub shop_name: String,
    pub token: String,
}

pub fn data_dir() -> PathBuf {
    let base = std::env::var_os("APPDATA").map(PathBuf::from).unwrap_or_else(|| PathBuf::from("."));
    base.join("ScanAndPrint")
}

fn config_path() -> PathBuf {
    data_dir().join("agent.json")
}

pub fn load() -> io::Result<Option<Config>> {
    let raw = match fs::read_to_string(config_path()) {
        Ok(raw) => raw,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e),
    };
    let stored: Stored = serde_json::from_str(&raw).map_err(io::Error::other)?;
    let encrypted = hex_decode(&stored.token).ok_or_else(|| io::Error::other("corrupt token in agent.json"))?;
    let token = String::from_utf8(unprotect(&encrypted)?).map_err(io::Error::other)?;
    Ok(Some(Config { server: stored.server, agent_id: stored.agent_id, shop_name: stored.shop_name, token }))
}

pub fn save(config: &Config) -> io::Result<()> {
    let stored = Stored {
        server: config.server.clone(),
        agent_id: config.agent_id.clone(),
        shop_name: config.shop_name.clone(),
        token: hex_encode(&protect(config.token.as_bytes())?),
    };
    fs::create_dir_all(data_dir())?;
    let json = serde_json::to_string_pretty(&stored).map_err(io::Error::other)?;
    fs::write(config_path(), json)
}

pub fn delete() -> io::Result<bool> {
    match fs::remove_file(config_path()) {
        Ok(()) => Ok(true),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(e),
    }
}

fn protect(data: &[u8]) -> io::Result<Vec<u8>> {
    let input = CRYPT_INTEGER_BLOB { cbData: data.len() as u32, pbData: data.as_ptr() as *mut u8 };
    let mut output = CRYPT_INTEGER_BLOB::default();
    unsafe {
        CryptProtectData(&input, w!("Scan & Print agent token"), None, None, None, CRYPTPROTECT_UI_FORBIDDEN, &mut output)
            .map_err(io::Error::other)?;
        Ok(take_blob(output))
    }
}

fn unprotect(data: &[u8]) -> io::Result<Vec<u8>> {
    let input = CRYPT_INTEGER_BLOB { cbData: data.len() as u32, pbData: data.as_ptr() as *mut u8 };
    let mut output = CRYPT_INTEGER_BLOB::default();
    unsafe {
        CryptUnprotectData(&input, None, None, None, None, CRYPTPROTECT_UI_FORBIDDEN, &mut output)
            .map_err(io::Error::other)?;
        Ok(take_blob(output))
    }
}

/// Copies a DPAPI output blob and frees the OS allocation.
unsafe fn take_blob(blob: CRYPT_INTEGER_BLOB) -> Vec<u8> {
    unsafe {
        let bytes = std::slice::from_raw_parts(blob.pbData, blob.cbData as usize).to_vec();
        LocalFree(Some(HLOCAL(blob.pbData as _)));
        bytes
    }
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn hex_decode(s: &str) -> Option<Vec<u8>> {
    if s.len() % 2 != 0 {
        return None;
    }
    (0..s.len()).step_by(2).map(|i| u8::from_str_radix(s.get(i..i + 2)?, 16).ok()).collect()
}
