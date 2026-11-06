//! The tray app: what the shop owner normally sees. A tray icon with a status menu, a pairing window on
//! first run, and a popup for cash orders waiting for approval. Printing runs on a background thread
//! (`runner`); everything here happens on the main thread's event loop.

use std::{
    path::PathBuf,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    thread::{self, JoinHandle},
    time::Duration,
};

use serde::Deserialize;
use tao::{
    dpi::LogicalSize,
    event::{Event, StartCause, WindowEvent},
    event_loop::{ControlFlow, EventLoopBuilder, EventLoopProxy, EventLoopWindowTarget},
    window::{Window, WindowBuilder, WindowId},
};
use tray_icon::{
    MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent,
    menu::{CheckMenuItem, Menu, MenuEvent, MenuItem, PredefinedMenuItem},
};
use wry::{WebContext, WebView, WebViewBuilder};

use crate::{
    VERSION,
    api::{ApiError, Approval, Client},
    config::{self, Config},
    icon::{self, Dot},
    install,
    log::{self, log},
    machine_name, print,
    runner::{self, Exit, RunnerEvent},
    system, update,
};

/// First update check shortly after start, then every few hours.
const FIRST_UPDATE_CHECK: Duration = Duration::from_secs(2 * 60);
const UPDATE_CHECK_EVERY: Duration = Duration::from_secs(6 * 60 * 60);

const STYLE: &str = include_str!("../ui/style.css");
const LOGO: &str = include_str!("../ui/logo.svg");
const PAIR_HTML: &str = include_str!("../ui/pair.html");
const APPROVALS_HTML: &str = include_str!("../ui/approvals.html");

#[derive(Debug, Clone, Copy, PartialEq)]
enum Page {
    Pair,
    Approvals,
}

enum UserEvent {
    Tray(TrayIconEvent),
    Menu(MenuEvent),
    Runner(RunnerEvent),
    /// The server rejected our token.
    Unpaired,
    Ipc(Page, String),
    Approvals(Result<Vec<Approval>, String>),
    Decided(Result<(), String>),
    Paired(Result<Config, String>),
    /// The installer, an update or the uninstaller asked us to quit.
    QuitRequested,
    /// The shortcut was clicked while we were already running.
    ShowRequested,
    /// The SumatraPDF download finished.
    Sumatra(Result<(), String>),
    /// A newer agent was downloaded and verified.
    UpdateReady(PathBuf),
    /// The printing thread finished its current job and stopped.
    RunnerStopped(AfterStop),
}

/// What to do once the printing thread has stopped.
enum AfterStop {
    Quit,
    Update(PathBuf),
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum IpcMessage {
    Ready,
    Close,
    OpenDashboard,
    Pair { code: String },
    Approve { id: String },
    Cancel { id: String },
}

#[derive(Clone, Copy, PartialEq)]
enum Status {
    Starting,
    Online { printers: usize, enabled: usize },
    Offline,
    Unpaired,
}

struct Popup {
    window: Window,
    webview: WebView,
}

struct Menus {
    status: MenuItem,
    approvals: MenuItem,
    dashboard: MenuItem,
    autostart: CheckMenuItem,
    pair: MenuItem,
    log: MenuItem,
    quit: MenuItem,
}

struct App {
    proxy: EventLoopProxy<UserEvent>,
    server: String,
    cfg: Option<Config>,
    /// The printing thread and its stop flag.
    runner: Option<(Arc<AtomicBool>, JoinHandle<()>)>,
    /// Quitting or updating: waiting for the printing thread to finish its job.
    stopping: bool,
    tray: Option<TrayIcon>,
    menus: Menus,
    web_context: WebContext,
    pair: Option<Popup>,
    approvals: Option<Popup>,
    status: Status,
    sumatra_missing: bool,
    /// Token of the last finished job and whether it printed.
    last_job: Option<(u32, bool)>,
    pending: u32,
    latest: Vec<Approval>,
    /// Close the approvals popup once the owner has dealt with the last order.
    close_when_empty: bool,
}

pub fn run(default_server: String) {
    let event_loop = EventLoopBuilder::<UserEvent>::with_user_event().build();

    let proxy = event_loop.create_proxy();
    TrayIconEvent::set_event_handler(Some(move |e| {
        let _ = proxy.send_event(UserEvent::Tray(e));
    }));
    let proxy = event_loop.create_proxy();
    MenuEvent::set_event_handler(Some(move |e| {
        let _ = proxy.send_event(UserEvent::Menu(e));
    }));

    let cfg = match config::load() {
        Ok(cfg) => cfg,
        Err(e) => {
            log(&format!("Could not read the saved connection: {e}"));
            None
        }
    };

    let mut app = App {
        proxy: event_loop.create_proxy(),
        server: cfg.as_ref().map(|c| c.server.clone()).unwrap_or(default_server),
        cfg,
        runner: None,
        stopping: false,
        tray: None,
        menus: Menus {
            status: MenuItem::new("চালু হচ্ছে…", false, None),
            approvals: MenuItem::new("ক্যাশ অর্ডার দেখুন", true, None),
            dashboard: MenuItem::new("ড্যাশবোর্ড খুলুন", true, None),
            autostart: CheckMenuItem::new("Windows চালু হলে এজেন্ট চালু করুন", true, system::autostart_enabled(), None),
            pair: MenuItem::new("দোকানের সাথে আবার যুক্ত করুন", true, None),
            log: MenuItem::new("লগ ফাইল দেখুন", true, None),
            quit: MenuItem::new("এজেন্ট বন্ধ করুন", true, None),
        },
        web_context: WebContext::new(Some(config::data_dir().join("webview"))),
        pair: None,
        approvals: None,
        status: Status::Starting,
        sumatra_missing: print::find_sumatra().is_none(),
        last_job: None,
        pending: 0,
        latest: Vec::new(),
        close_when_empty: false,
    };

    event_loop.run(move |event, target, control_flow| {
        *control_flow = ControlFlow::Wait;
        match event {
            Event::NewEvents(StartCause::Init) => app.start(target),
            Event::WindowEvent { window_id, event: WindowEvent::CloseRequested, .. } => app.close_window(window_id),
            Event::UserEvent(event) => {
                if app.handle(event, target) {
                    app.tray = None;
                    *control_flow = ControlFlow::Exit;
                }
            }
            _ => {}
        }
    });
}

impl App {
    fn start(&mut self, target: &EventLoopWindowTarget<UserEvent>) {
        log(&format!("Scan & Print agent {VERSION} (tray) started"));
        let m = &self.menus;
        let menu = Menu::new();
        let separator = PredefinedMenuItem::separator();
        let _ = menu.append_items(&[
            &m.status,
            &separator,
            &m.approvals,
            &m.dashboard,
            &PredefinedMenuItem::separator(),
            &m.autostart,
            &m.pair,
            &m.log,
            &PredefinedMenuItem::separator(),
            &m.quit,
        ]);
        self.tray = TrayIconBuilder::new()
            .with_menu(Box::new(menu))
            .with_menu_on_left_click(false)
            .with_tooltip("Scan & Print")
            .with_icon(tray_icon(Status::Starting, false))
            .build()
            .map_err(|e| log(&format!("Could not create the tray icon: {e}")))
            .ok();

        // The installer, an update or the uninstaller can ask us to quit.
        let proxy = self.proxy.clone();
        system::on_quit_request(move || {
            let _ = proxy.send_event(UserEvent::QuitRequested);
        });
        let proxy = self.proxy.clone();
        system::on_show_request(move || {
            let _ = proxy.send_event(UserEvent::ShowRequested);
        });

        if self.sumatra_missing {
            let server = self.server.clone();
            let proxy = self.proxy.clone();
            thread::spawn(move || {
                let _ = proxy.send_event(UserEvent::Sumatra(update::ensure_sumatra(&server)));
            });
        }

        // Only the installed copy updates itself (not a dev build run from target/).
        if install::is_installed_copy() {
            let server = self.server.clone();
            let proxy = self.proxy.clone();
            thread::spawn(move || {
                thread::sleep(FIRST_UPDATE_CHECK);
                loop {
                    match update::check_and_download(&server) {
                        Ok(Some(path)) => {
                            let _ = proxy.send_event(UserEvent::UpdateReady(path));
                            return;
                        }
                        Ok(None) => {}
                        Err(e) => log(&e),
                    }
                    thread::sleep(UPDATE_CHECK_EVERY);
                }
            });
        }

        match self.cfg.clone() {
            Some(cfg) => self.start_runner(cfg),
            None => {
                self.set_status(Status::Unpaired);
                self.open_pair(target);
            }
        }
    }

    /// Stops the printing thread (it finishes the job in hand first), then does `after`.
    fn stop_then(&mut self, after: AfterStop) {
        if self.stopping {
            return;
        }
        self.stopping = true;
        // Nothing should look clickable while we wait.
        self.pair = None;
        self.approvals = None;
        self.menus.status.set_text("বন্ধ হচ্ছে…");
        let proxy = self.proxy.clone();
        let runner = self.runner.take();
        thread::spawn(move || {
            if let Some((stop, handle)) = runner {
                stop.store(true, Ordering::Relaxed);
                let _ = handle.join();
            }
            let _ = proxy.send_event(UserEvent::RunnerStopped(after));
        });
    }

    /// Returns true when the app should quit.
    fn handle(&mut self, event: UserEvent, target: &EventLoopWindowTarget<UserEvent>) -> bool {
        match event {
            UserEvent::Tray(TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. }) => {
                if self.cfg.is_some() {
                    self.show_approvals(target, false);
                } else {
                    self.open_pair(target);
                }
            }
            UserEvent::Tray(_) => {}
            UserEvent::Menu(event) => {
                let m = &self.menus;
                if event.id == *m.quit.id() {
                    log("Quit from the tray menu");
                    self.stop_then(AfterStop::Quit);
                } else if event.id == *m.approvals.id() {
                    self.show_approvals(target, false);
                } else if event.id == *m.dashboard.id() {
                    system::open(&format!("{}/dashboard", self.server));
                } else if event.id == *m.pair.id() {
                    self.open_pair(target);
                } else if event.id == *m.log.id() {
                    system::open(&log::path().to_string_lossy());
                } else if event.id == *m.autostart.id() {
                    let enabled = m.autostart.is_checked();
                    if let Err(e) = system::set_autostart(enabled) {
                        log(&format!("Could not change start-with-Windows: {e}"));
                    }
                    m.autostart.set_checked(system::autostart_enabled());
                }
            }
            UserEvent::Runner(event) => match event {
                RunnerEvent::Online { printers, enabled } => self.set_status(Status::Online { printers, enabled }),
                RunnerEvent::Offline => self.set_status(Status::Offline),
                RunnerEvent::JobFinished { token, ok } => {
                    self.last_job = Some((token, ok));
                    self.set_status(self.status);
                }
                RunnerEvent::PendingApprovals(count) => {
                    let increased = count > self.pending;
                    self.pending = count;
                    self.set_status(self.status);
                    if increased {
                        // A new cash order: pop up and chime.
                        system::chime();
                        self.show_approvals(target, true);
                    } else if self.approvals.is_some() {
                        self.fetch_approvals();
                    }
                }
            },
            UserEvent::ShowRequested if !self.stopping => {
                if self.cfg.is_some() {
                    self.show_approvals(target, false);
                } else {
                    self.open_pair(target);
                }
            }
            UserEvent::ShowRequested => {}
            UserEvent::QuitRequested => {
                log("Asked to quit by the installer");
                self.stop_then(AfterStop::Quit);
            }
            UserEvent::Sumatra(result) => {
                if let Err(e) = result {
                    log(&format!("Could not download SumatraPDF: {e}"));
                }
                self.sumatra_missing = print::find_sumatra().is_none();
                self.set_status(self.status);
            }
            UserEvent::UpdateReady(path) => self.stop_then(AfterStop::Update(path)),
            UserEvent::RunnerStopped(AfterStop::Quit) => return true,
            UserEvent::RunnerStopped(AfterStop::Update(path)) => match update::apply(&path) {
                Ok(()) => return true,
                Err(e) => {
                    log(&format!("Could not start the update: {e}"));
                    self.stopping = false;
                    if let Some(cfg) = self.cfg.clone() {
                        self.start_runner(cfg);
                    }
                }
            },
            UserEvent::Unpaired => {
                self.stop_runner();
                self.cfg = None;
                self.set_status(Status::Unpaired);
                self.open_pair(target);
            }
            UserEvent::Ipc(page, body) => self.handle_ipc(page, &body),
            UserEvent::Approvals(Ok(jobs)) => {
                let empty = jobs.is_empty();
                self.latest = jobs;
                if empty && self.close_when_empty {
                    self.approvals = None;
                } else {
                    self.render_approvals();
                }
                self.close_when_empty = false;
            }
            UserEvent::Approvals(Err(e)) | UserEvent::Decided(Err(e)) => {
                if let Some(popup) = &self.approvals {
                    let _ = popup.webview.evaluate_script(&format!("showError({})", js_string(&e)));
                }
            }
            UserEvent::Decided(Ok(())) => {
                self.close_when_empty = true;
                self.fetch_approvals();
            }
            UserEvent::Paired(result) => {
                let shop = result.as_ref().map(|c| c.shop_name.clone()).unwrap_or_default();
                let (ok, message) = match result {
                    Ok(cfg) => {
                        if let Err(e) = config::save(&cfg) {
                            log(&format!("Could not save the connection: {e}"));
                        }
                        // First pairing: start with Windows from now on.
                        if !system::autostart_enabled() {
                            let _ = system::set_autostart(true);
                            self.menus.autostart.set_checked(system::autostart_enabled());
                        }
                        log("Paired with the shop");
                        self.server = cfg.server.clone();
                        self.cfg = Some(cfg.clone());
                        self.pending = 0;
                        self.start_runner(cfg);
                        (true, String::new())
                    }
                    Err(message) => (false, message),
                };
                if let Some(popup) = &self.pair {
                    let script = format!("pairResult({ok}, {}, {})", js_string(&message), js_string(&shop));
                    let _ = popup.webview.evaluate_script(&script);
                }
            }
        }
        false
    }

    fn handle_ipc(&mut self, page: Page, body: &str) {
        let Ok(message) = serde_json::from_str::<IpcMessage>(body) else { return };
        match message {
            IpcMessage::Ready if page == Page::Approvals => self.render_approvals(),
            IpcMessage::Ready => {}
            IpcMessage::Close => match page {
                Page::Pair => self.pair = None,
                Page::Approvals => self.approvals = None,
            },
            IpcMessage::OpenDashboard => system::open(&format!("{}/dashboard/devices", self.server)),
            IpcMessage::Pair { code } => {
                let server = self.server.clone();
                let proxy = self.proxy.clone();
                thread::spawn(move || {
                    let result = Client::new(&server, None)
                        .pair(&code, &machine_name(), VERSION)
                        .map(|r| Config { server: server.clone(), agent_id: r.agent_id, shop_name: r.shop.name, token: r.token })
                        .map_err(|e| match e {
                            ApiError::Status(404, _) => "কোডটি ভুল অথবা মেয়াদোত্তীর্ণ। ড্যাশবোর্ড থেকে নতুন কোড নিন।".to_string(),
                            other => bangla_error(&other),
                        });
                    let _ = proxy.send_event(UserEvent::Paired(result));
                });
            }
            IpcMessage::Approve { id } => self.decide(id, true),
            IpcMessage::Cancel { id } => self.decide(id, false),
        }
    }

    fn decide(&self, id: String, approve: bool) {
        let Some(client) = self.client() else { return };
        let proxy = self.proxy.clone();
        thread::spawn(move || {
            let result = client.decide(&id, approve).map_err(|e| bangla_error(&e));
            let _ = proxy.send_event(UserEvent::Decided(result));
        });
    }

    fn client(&self) -> Option<Client> {
        self.cfg.as_ref().map(|c| Client::new(&c.server, Some(c.token.clone())))
    }

    fn start_runner(&mut self, cfg: Config) {
        self.stop_runner();
        let stop = Arc::new(AtomicBool::new(false));
        self.set_status(Status::Starting);
        let proxy = self.proxy.clone();
        let thread_stop = stop.clone();
        let handle = thread::spawn(move || {
            let stop = thread_stop;
            let opts = runner::Options { dry_run: false, include_virtual: false };
            let notify = |event| {
                let _ = proxy.send_event(UserEvent::Runner(event));
            };
            if let Exit::Unauthorized = runner::run(&cfg, &opts, stop, notify) {
                let _ = proxy.send_event(UserEvent::Unpaired);
            }
        });
        self.runner = Some((stop, handle));
    }

    fn stop_runner(&mut self) {
        // The old thread finishes its current job on its own; nothing waits for it.
        if let Some((stop, _)) = self.runner.take() {
            stop.store(true, Ordering::Relaxed);
        }
    }

    fn fetch_approvals(&self) {
        let Some(client) = self.client() else { return };
        let proxy = self.proxy.clone();
        thread::spawn(move || {
            let result = client.approvals().map_err(|e| bangla_error(&e));
            let _ = proxy.send_event(UserEvent::Approvals(result));
        });
    }

    fn show_approvals(&mut self, target: &EventLoopWindowTarget<UserEvent>, on_top: bool) {
        if self.cfg.is_none() {
            return;
        }
        match &self.approvals {
            Some(popup) => {
                popup.window.set_minimized(false);
                popup.window.set_focus();
            }
            None => self.approvals = self.open_popup(target, Page::Approvals, on_top),
        }
        self.fetch_approvals();
    }

    fn render_approvals(&self) {
        if let Some(popup) = &self.approvals {
            let json = serde_json::to_string(&self.latest).unwrap_or_else(|_| "[]".into());
            let _ = popup.webview.evaluate_script(&format!("render({json})"));
        }
    }

    fn open_pair(&mut self, target: &EventLoopWindowTarget<UserEvent>) {
        match &self.pair {
            Some(popup) => popup.window.set_focus(),
            None => self.pair = self.open_popup(target, Page::Pair, true),
        }
    }

    fn open_popup(&mut self, target: &EventLoopWindowTarget<UserEvent>, page: Page, on_top: bool) -> Option<Popup> {
        build_popup(target, &mut self.web_context, self.proxy.clone(), page, on_top)
    }

    fn close_window(&mut self, id: WindowId) {
        if self.pair.as_ref().is_some_and(|p| p.window.id() == id) {
            self.pair = None;
        }
        if self.approvals.as_ref().is_some_and(|p| p.window.id() == id) {
            self.approvals = None;
        }
    }

    fn set_status(&mut self, status: Status) {
        self.status = status;
        let text = match status {
            Status::Starting => "চালু হচ্ছে…".to_string(),
            Status::Online { printers, enabled: 0 } => {
                format!("অনলাইন · {} প্রিন্টার পাওয়া গেছে, কোনোটি চালু নেই", bn(printers))
            }
            Status::Online { enabled, .. } => format!("অনলাইন · {} প্রিন্টার চালু", bn(enabled)),
            Status::Offline => "অফলাইন · ইন্টারনেট সংযোগ নেই, আবার চেষ্টা করছে".to_string(),
            Status::Unpaired => "দোকানের সাথে যুক্ত নয়".to_string(),
        };
        let text = if self.sumatra_missing { format!("{text} · প্রিন্ট সফটওয়্যার পাওয়া যায়নি") } else { text };
        self.menus.status.set_text(&text);
        self.menus.approvals.set_text(if self.pending > 0 {
            format!("ক্যাশ অর্ডার দেখুন ({})", bn(self.pending as usize))
        } else {
            "ক্যাশ অর্ডার দেখুন".to_string()
        });
        self.menus.approvals.set_enabled(self.cfg.is_some());
        if let Some(tray) = &self.tray {
            let last = match self.last_job {
                Some((token, true)) => format!("\nসর্বশেষ: #{} প্রিন্ট হয়েছে", bn(token as usize)),
                Some((token, false)) => format!("\nসর্বশেষ: #{} প্রিন্ট হয়নি", bn(token as usize)),
                None => String::new(),
            };
            let _ = tray.set_tooltip(Some(format!("Scan & Print\n{text}{last}")));
            let _ = tray.set_icon(Some(tray_icon(status, self.pending > 0 || self.sumatra_missing)));
        }
    }
}

fn bangla_error(error: &ApiError) -> String {
    match error {
        ApiError::Status(_, message) if !message.is_empty() => message.clone(),
        ApiError::Unauthorized => "এই কম্পিউটারটি দোকান থেকে সরানো হয়েছে। আবার যুক্ত করুন।".into(),
        ApiError::Network(_) => "সার্ভারে পৌঁছানো যাচ্ছে না। ইন্টারনেট সংযোগ দেখুন।".into(),
        ApiError::Status(code, _) => format!("সার্ভারে সমস্যা হয়েছে ({code})"),
    }
}

fn js_string(s: &str) -> String {
    serde_json::to_string(s).unwrap_or_else(|_| "\"\"".into())
}

/// Number with Bangla digits.
fn bn(n: usize) -> String {
    n.to_string().chars().map(|c| char::from_u32(c as u32 - '0' as u32 + 0x09E6).unwrap_or(c)).collect()
}

fn dot(status: Status, attention: bool) -> Dot {
    match status {
        _ if attention => Dot::Orange,
        Status::Online { .. } => Dot::Green,
        Status::Offline | Status::Unpaired => Dot::Red,
        Status::Starting => Dot::None,
    }
}

fn tray_icon(status: Status, attention: bool) -> tray_icon::Icon {
    tray_icon::Icon::from_rgba(icon::rgba(32, dot(status, attention)), 32, 32).expect("valid icon")
}

fn window_icon() -> Option<tao::window::Icon> {
    tao::window::Icon::from_rgba(icon::rgba(32, Dot::None), 32, 32).ok()
}

/// Title, size (logical px) and whether the user may resize, per window.
fn page_window(page: Page) -> (&'static str, (f64, f64), bool) {
    match page {
        Page::Pair => ("Scan & Print", (440.0, 500.0), false),
        Page::Approvals => ("ক্যাশ অর্ডার — Scan & Print", (480.0, 620.0), true),
    }
}

fn page_html(page: Page) -> String {
    match page {
        Page::Pair => PAIR_HTML,
        Page::Approvals => APPROVALS_HTML,
    }
    .replace("/*STYLE*/", STYLE)
    .replace("<!--LOGO-->", LOGO)
}

fn build_popup(
    target: &EventLoopWindowTarget<UserEvent>,
    web_context: &mut WebContext,
    proxy: EventLoopProxy<UserEvent>,
    page: Page,
    on_top: bool,
) -> Option<Popup> {
    let (title, (width, height), resizable) = page_window(page);
    let window = WindowBuilder::new()
        .with_title(title)
        .with_inner_size(LogicalSize::new(width, height))
        .with_min_inner_size(LogicalSize::new(width.min(400.0), 420.0))
        .with_resizable(resizable)
        .with_maximizable(resizable)
        .with_always_on_top(on_top)
        .with_window_icon(window_icon())
        .build(target)
        .map_err(|e| log(&format!("Could not open a window: {e}")))
        .ok()?;
    let webview = WebViewBuilder::new_with_web_context(web_context)
        .with_html(page_html(page))
        .with_devtools(cfg!(debug_assertions))
        // Ctrl+wheel zoom would break the fixed layout.
        .with_hotkeys_zoom(false)
        .with_ipc_handler(move |request| {
            let _ = proxy.send_event(UserEvent::Ipc(page, request.body().clone()));
        })
        .build(&window)
        .map_err(|e| log(&format!("Could not open the web view (is WebView2 installed?): {e}")))
        .ok()?;
    window.set_focus();
    Some(Popup { window, webview })
}

/// Debug builds only: `scan-print-agent ui-preview <pair|pair-error|pair-done|approvals|approvals-empty>`
/// opens a window with sample data, without touching the saved connection or a running agent.
#[cfg(debug_assertions)]
pub fn preview(which: &str) {
    let (page, script) = match which {
        "pair" => (Page::Pair, String::new()),
        "pair-error" => (
            Page::Pair,
            r#"document.getElementById("code").value = "WRONG123"; pairResult(false, "কোডটি ভুল অথবা মেয়াদোত্তীর্ণ। ড্যাশবোর্ড থেকে নতুন কোড নিন।", "")"#.into(),
        ),
        "pair-done" => (Page::Pair, r#"pairResult(true, "", "Rakib Photocopy")"#.into()),
        "approvals-empty" => (Page::Approvals, "render([])".into()),
        _ => {
            let now = "2026-11-07T06:30:00Z";
            let jobs = serde_json::json!([
                { "id": "a", "token": 7, "pageCount": 2, "copies": 3, "colorMode": "bw", "amount": 12, "createdAt": now },
                { "id": "b", "token": 12, "pageCount": 14, "copies": 1, "colorMode": "color", "amount": 140, "createdAt": now },
            ]);
            (Page::Approvals, format!("render({jobs})"))
        }
    };
    let event_loop = EventLoopBuilder::<UserEvent>::with_user_event().build();
    let mut web_context = WebContext::new(Some(std::env::temp_dir().join("scan-print-ui-preview")));
    let Some(popup) = build_popup(&event_loop, &mut web_context, event_loop.create_proxy(), page, false) else { return };
    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        match event {
            Event::UserEvent(UserEvent::Ipc(_, body)) if body.contains("\"ready\"") => {
                let _ = popup.webview.evaluate_script(&script);
            }
            Event::UserEvent(UserEvent::Ipc(_, body)) if body.contains("\"close\"") => *control_flow = ControlFlow::Exit,
            Event::WindowEvent { event: WindowEvent::CloseRequested, .. } => *control_flow = ControlFlow::Exit,
            _ => {}
        }
    });
}
