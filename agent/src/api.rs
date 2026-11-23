//! Client for the server's agent API (`app/api/agent/*`).

use std::{fmt, fs::File, io, path::Path, time::Duration};

use serde::{Deserialize, Serialize, de::DeserializeOwned};

/// Largest PDF the agent will download.
const MAX_FILE_BYTES: u64 = 200 * 1024 * 1024;

#[derive(Debug)]
pub enum ApiError {
    /// The token was rejected: the agent was removed in the dashboard and must be paired again.
    Unauthorized,
    /// The server answered with an error status.
    Status(u16, String),
    /// No connection, timeout, bad response body, or a local file error.
    Network(String),
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ApiError::Unauthorized => write!(f, "the server rejected this agent's token"),
            ApiError::Status(code, msg) if msg.is_empty() => write!(f, "server returned HTTP {code}"),
            ApiError::Status(code, msg) => write!(f, "server returned HTTP {code}: {msg}"),
            ApiError::Network(msg) => write!(f, "{msg}"),
        }
    }
}

fn network(error: impl fmt::Display) -> ApiError {
    ApiError::Network(error.to_string())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairResponse {
    pub token: String,
    pub agent_id: String,
    pub shop: ShopInfo,
}

#[derive(Deserialize)]
pub struct ShopInfo {
    pub name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrinterReport {
    pub system_name: String,
    pub color: bool,
    pub duplex: bool,
    pub paper_sizes: Vec<String>,
    /// Paper sizes the printer can print on both sides (agent 1.2.0+).
    pub duplex_sizes: Vec<String>,
    pub state: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeartbeatResponse {
    pub devices: Vec<DeviceStatus>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceStatus {
    pub system_name: String,
    pub enabled: bool,
}

#[derive(Deserialize)]
pub struct ClaimResponse {
    pub job: Option<Job>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    pub id: String,
    pub token: u32,
    pub page_count: u32,
    pub printer: String,
    /// "bw" or "color".
    pub color_mode: String,
    pub copies: u32,
    /// Pages to print as SumatraPDF ranges ("1-3,5"); None prints every page.
    #[serde(default)]
    pub pages: Option<String>,
    /// Print on both sides of the paper.
    #[serde(default)]
    pub duplex: bool,
    /// "A4", "Legal" or "A3"; None means A4.
    #[serde(default)]
    pub paper_size: Option<String>,
}

/// A counter transfer the agent opened (`/api/agent/transfers`).
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferOpened {
    pub id: String,
    pub url: String,
    /// The link as a QR code (SVG) for the counter window.
    pub qr_svg: String,
}

#[derive(Deserialize)]
pub struct TransferState {
    pub open: bool,
    pub files: Vec<TransferFile>,
}

#[derive(Deserialize)]
pub struct TransferFile {
    pub id: String,
    pub name: String,
    /// "shop" (our scans) or "customer" (files the phone sent).
    pub from: String,
    pub fetched: bool,
    pub available: bool,
}

pub struct Client {
    http: ureq::Agent,
    server: String,
    token: Option<String>,
}

impl Client {
    pub fn new(server: &str, token: Option<String>) -> Self {
        let http: ureq::Agent = ureq::Agent::config_builder()
            .http_status_as_error(false)
            .timeout_connect(Some(Duration::from_secs(15)))
            .timeout_recv_response(Some(Duration::from_secs(30)))
            .timeout_recv_body(Some(Duration::from_secs(600)))
            .user_agent(concat!("mudron-agent/", env!("CARGO_PKG_VERSION")))
            .build()
            .into();
        Client { http, server: server.trim_end_matches('/').to_string(), token }
    }

    pub fn pair(&self, code: &str, machine_name: &str, version: &str) -> Result<PairResponse, ApiError> {
        self.post(
            "/api/agent/pair",
            &serde_json::json!({ "code": code, "machineName": machine_name, "version": version }),
        )
    }

    pub fn heartbeat(&self, machine_name: &str, version: &str, printers: &[PrinterReport]) -> Result<HeartbeatResponse, ApiError> {
        self.post(
            "/api/agent/heartbeat",
            &serde_json::json!({ "machineName": machine_name, "version": version, "printers": printers }),
        )
    }

    pub fn claim(&self) -> Result<ClaimResponse, ApiError> {
        self.post("/api/agent/jobs/claim", &serde_json::json!({}))
    }

    pub fn report(&self, job_id: &str, error: Option<&str>) -> Result<(), ApiError> {
        let body = match error {
            None => serde_json::json!({ "status": "completed" }),
            Some(error) => serde_json::json!({ "status": "failed", "error": error }),
        };
        self.post::<serde_json::Value>(&format!("/api/agent/jobs/{job_id}"), &body).map(|_| ())
    }

    /// Downloads a claimed job's PDF to `dest`. The URL is built from our own server address (not the
    /// `fileUrl` in the claim response) so the bearer token is never sent anywhere else.
    pub fn download(&self, job_id: &str, dest: &Path) -> Result<u64, ApiError> {
        let mut request = self.http.get(format!("{}/api/agent/jobs/{job_id}/file", self.server));
        if let Some(token) = &self.token {
            request = request.header("Authorization", format!("Bearer {token}"));
        }
        let response = request.call().map_err(network)?;
        let response = check_status(response)?;
        let mut reader = response.into_body().into_with_config().limit(MAX_FILE_BYTES).reader();
        let mut file = File::create(dest).map_err(network)?;
        io::copy(&mut reader, &mut file).map_err(network)
    }

    /// Opens a counter transfer: "scan" sends this PC's scans to a phone, "receive" brings a phone's files here.
    pub fn open_transfer(&self, kind: &str) -> Result<TransferOpened, ApiError> {
        self.post("/api/agent/transfers", &serde_json::json!({ "kind": kind }))
    }

    pub fn transfer_state(&self, id: &str) -> Result<TransferState, ApiError> {
        let response = self.authorized(self.http.get(format!("{}/api/agent/transfers/{id}", self.server))).call().map_err(network)?;
        check_status(response)?.body_mut().read_json().map_err(network)
    }

    /// Sends one scanned file to a "scan" transfer.
    pub fn send_scan(&self, id: &str, name: &str, path: &Path) -> Result<(), ApiError> {
        let data = std::fs::read(path).map_err(network)?;
        let url = format!("{}/api/agent/transfers/{id}/files?name={}", self.server, percent_encode(name));
        let response = self
            .authorized(self.http.post(url))
            .header("Content-Type", "application/octet-stream")
            .send(&data[..])
            .map_err(network)?;
        check_status(response).map(|_| ())
    }

    /// Downloads a file the customer sent to `dest`.
    pub fn fetch_transfer_file(&self, id: &str, file_id: &str, dest: &Path) -> Result<u64, ApiError> {
        let url = format!("{}/api/agent/transfers/{id}/files/{file_id}", self.server);
        let response = self.authorized(self.http.get(url)).call().map_err(network)?;
        let response = check_status(response)?;
        let mut reader = response.into_body().into_with_config().limit(MAX_FILE_BYTES).reader();
        let mut file = File::create(dest).map_err(network)?;
        io::copy(&mut reader, &mut file).map_err(network)
    }

    /// Tells the server a customer's file is saved here, so it deletes its copy.
    pub fn ack_transfer_file(&self, id: &str, file_id: &str) -> Result<(), ApiError> {
        let url = format!("{}/api/agent/transfers/{id}/files/{file_id}", self.server);
        check_status(self.authorized(self.http.delete(url)).call().map_err(network)?).map(|_| ())
    }

    /// Ends a transfer; the server deletes its files.
    pub fn close_transfer(&self, id: &str) -> Result<(), ApiError> {
        let url = format!("{}/api/agent/transfers/{id}", self.server);
        check_status(self.authorized(self.http.delete(url)).call().map_err(network)?).map(|_| ())
    }

    fn authorized<B>(&self, request: ureq::RequestBuilder<B>) -> ureq::RequestBuilder<B> {
        match &self.token {
            Some(token) => request.header("Authorization", format!("Bearer {token}")),
            None => request,
        }
    }

    fn post<T: DeserializeOwned>(&self, path: &str, body: &impl Serialize) -> Result<T, ApiError> {
        let mut request = self.http.post(format!("{}{path}", self.server));
        if let Some(token) = &self.token {
            request = request.header("Authorization", format!("Bearer {token}"));
        }
        let response = request.send_json(body).map_err(network)?;
        let mut response = check_status(response)?;
        response.body_mut().read_json().map_err(network)
    }
}

/// Percent-encodes a query value (file names may be Bangla or have spaces).
fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (b as char).to_string(),
            _ => format!("%{b:02X}"),
        })
        .collect()
}

fn check_status(mut response: ureq::http::Response<ureq::Body>) -> Result<ureq::http::Response<ureq::Body>, ApiError> {
    let status = response.status().as_u16();
    if status == 401 {
        return Err(ApiError::Unauthorized);
    }
    if !(200..300).contains(&status) {
        // The server answers errors as { "error": "<message>" }.
        let message = response
            .body_mut()
            .read_json::<serde_json::Value>()
            .ok()
            .and_then(|v| v.get("error")?.as_str().map(str::to_string))
            .unwrap_or_default();
        return Err(ApiError::Status(status, message));
    }
    Ok(response)
}
