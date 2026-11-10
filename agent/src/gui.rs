//! The tray app: what the shop owner normally sees. A tray icon with a status menu, a pairing window on
//! first run, and a status window (tray click / shortcut). Printing runs on a background thread
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
    api::{ApiError, Client},
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
const STATUS_HTML: &str = include_str!("../ui/status.html");
/// Retry the SumatraPDF download this often until it succeeds.
const SUMATRA_RETRY: Duration = Duration::from_secs(60);

#[derive(Debug, Clone, Copy, PartialEq)]
enum Page {
    Pair,
    Status,
}

enum UserEvent {
    Tray(TrayIconEvent),
    Menu(MenuEvent),
    Runner(RunnerEvent),
    /// The server rejected our token.
    Unpaired,
    Ipc(Page, String),
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
    show: MenuItem,
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
    status_window: Option<Popup>,
    status: Status,
    sumatra_missing: bool,
    /// Token of the last finished job and whether it printed.
    last_job: Option<(u32, bool)>,
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
            show: MenuItem::new("এজেন্টের অবস্থা দেখুন", true, None),
            dashboard: MenuItem::new("ড্যাশবোর্ড খুলুন", true, None),
            autostart: CheckMenuItem::new("Windows চালু হলে এজেন্ট চালু করুন", true, system::autostart_enabled(), None),
            pair: MenuItem::new("দোকানের সাথে আবার যুক্ত করুন", true, None),
            log: MenuItem::new("লগ ফাইল দেখুন", true, None),
            quit: MenuItem::new("এজেন্ট বন্ধ করুন", true, None),
        },
        web_context: WebContext::new(Some(config::data_dir().join("webview"))),
        pair: None,
        status_window: None,
        status: Status::Starting,
        sumatra_missing: print::find_sumatra().is_none(),
        last_job: None,
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
        log(&format!("Mudron agent {VERSION} (tray) started"));
        let m = &self.menus;
        let menu = Menu::new();
        let separator = PredefinedMenuItem::separator();
        let _ = menu.append_items(&[
            &m.status,
            &separator,
            &m.show,
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
            .with_tooltip("Mudron")
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
            self.download_sumatra(Duration::ZERO);
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
        self.status_window = None;
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
                self.show(target)
            }
            UserEvent::Tray(_) => {}
            UserEvent::Menu(event) => {
                let m = &self.menus;
                if event.id == *m.quit.id() {
                    log("Quit from the tray menu");
                    self.stop_then(AfterStop::Quit);
                } else if event.id == *m.show.id() {
                    self.show(target);
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
            },
            UserEvent::ShowRequested if !self.stopping => self.show(target),
            UserEvent::ShowRequested => {}
            UserEvent::QuitRequested => {
                log("Asked to quit by the installer");
                self.stop_then(AfterStop::Quit);
            }
            UserEvent::Sumatra(result) => {
                if let Err(e) = result {
                    log(&format!("Could not download SumatraPDF: {e}"));
                    self.download_sumatra(SUMATRA_RETRY);
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
            IpcMessage::Ready if page == Page::Status => self.render_status(),
            IpcMessage::Ready => {}
            IpcMessage::Close => match page {
                Page::Pair => self.pair = None,
                Page::Status => self.status_window = None,
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
        }
    }

    fn download_sumatra(&self, after: Duration) {
        let server = self.server.clone();
        let proxy = self.proxy.clone();
        thread::spawn(move || {
            thread::sleep(after);
            let _ = proxy.send_event(UserEvent::Sumatra(update::ensure_sumatra(&server)));
        });
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

    /// Tray click, the shortcut, or the menu: the pairing window if not paired, else the status window.
    fn show(&mut self, target: &EventLoopWindowTarget<UserEvent>) {
        if self.cfg.is_none() {
            return self.open_pair(target);
        }
        match &self.status_window {
            Some(popup) => {
                popup.window.set_minimized(false);
                popup.window.set_focus();
            }
            None => self.status_window = self.open_popup(target, Page::Status, false),
        }
    }

    fn render_status(&self) {
        let Some(popup) = &self.status_window else { return };
        let (state, printers, enabled) = match self.status {
            Status::Starting => ("starting", 0, 0),
            Status::Online { printers, enabled } => ("online", printers, enabled),
            Status::Offline => ("offline", 0, 0),
            Status::Unpaired => ("unpaired", 0, 0),
        };
        let data = serde_json::json!({
            "state": state,
            "printers": printers,
            "enabled": enabled,
            "shop": self.cfg.as_ref().map(|c| c.shop_name.clone()).unwrap_or_default(),
            "lastJob": self.last_job.map(|(token, ok)| serde_json::json!({ "token": token, "ok": ok })),
            "sumatraMissing": self.sumatra_missing,
            "version": VERSION,
        });
        let _ = popup.webview.evaluate_script(&format!("render({data})"));
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
        if self.status_window.as_ref().is_some_and(|p| p.window.id() == id) {
            self.status_window = None;
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
        self.render_status();
        if let Some(tray) = &self.tray {
            let last = match self.last_job {
                Some((token, true)) => format!("\nসর্বশেষ: #{} প্রিন্ট হয়েছে", bn(token as usize)),
                Some((token, false)) => format!("\nসর্বশেষ: #{} প্রিন্ট হয়নি", bn(token as usize)),
                None => String::new(),
            };
            let _ = tray.set_tooltip(Some(format!("Mudron\n{text}{last}")));
            let _ = tray.set_icon(Some(tray_icon(status, self.sumatra_missing)));
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
        Page::Pair => ("Mudron", (440.0, 500.0), false),
        Page::Status => ("Mudron", (420.0, 570.0), false),
    }
}

fn page_html(page: Page) -> String {
    match page {
        Page::Pair => PAIR_HTML,
        Page::Status => STATUS_HTML,
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

/// Debug builds only: `scan-print-agent ui-preview <pair|pair-error|pair-done|status|status-setup|status-offline>`
/// opens a window with sample data, without touching the saved connection or a running agent.
#[cfg(debug_assertions)]
pub fn preview(which: &str) {
    let status = |data: serde_json::Value| (Page::Status, format!("render({data})"));
    let (page, script) = match which {
        "pair" => (Page::Pair, String::new()),
        "pair-error" => (
            Page::Pair,
            r#"document.getElementById("code").value = "WRONG123"; pairResult(false, "কোডটি ভুল অথবা মেয়াদোত্তীর্ণ। ড্যাশবোর্ড থেকে নতুন কোড নিন।", "")"#.into(),
        ),
        "pair-done" => (Page::Pair, r#"pairResult(true, "", "Rakib Photocopy")"#.into()),
        "status-setup" => status(serde_json::json!({
            "state": "online", "printers": 2, "enabled": 0, "shop": "Rakib Photocopy",
            "lastJob": null, "sumatraMissing": true, "version": VERSION,
        })),
        "status-offline" => status(serde_json::json!({
            "state": "offline", "printers": 0, "enabled": 0, "shop": "Rakib Photocopy",
            "lastJob": { "token": 41, "ok": false }, "sumatraMissing": false, "version": VERSION,
        })),
        _ => status(serde_json::json!({
            "state": "online", "printers": 3, "enabled": 2, "shop": "Rakib Photocopy",
            "lastJob": { "token": 42, "ok": true }, "sumatraMissing": false, "version": VERSION,
        })),
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
