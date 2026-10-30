use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, WebviewWindow, WebviewWindowBuilder};

const WINDOW_LABEL: &str = "input-viewer";
const WINDOW_WIDTH: f64 = 340.0;
const WINDOW_HEIGHT: f64 = 510.0;
const SCREEN_MARGIN: f64 = 18.0;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InputViewerSnapshot {
    x: i32,
    y: i32,
    normalized_x: f64,
    normalized_y: f64,
    delta_x: i32,
    delta_y: i32,
    scroll_delta: i32,
    cursor_visible: bool,
    mouse_buttons: Vec<String>,
    pressed_keys: Vec<String>,
}

#[tauri::command]
pub fn get_input_viewer_state(app: AppHandle) -> Result<bool, String> {
    Ok(app
        .get_webview_window(WINDOW_LABEL)
        .is_some_and(|window| window.is_visible().unwrap_or(false)))
}

/// Reads only the current key/button down states and current cursor location.
/// No key history, text, or input data is persisted.
#[tauri::command]
pub fn get_input_snapshot() -> InputViewerSnapshot {
    #[cfg(target_os = "windows")]
    {
        return windows_snapshot();
    }

    #[cfg(not(target_os = "windows"))]
    InputViewerSnapshot {
        x: 0,
        y: 0,
        normalized_x: 0.0,
        normalized_y: 0.0,
        delta_x: 0,
        delta_y: 0,
        scroll_delta: 0,
        cursor_visible: false,
        mouse_buttons: Vec::new(),
        pressed_keys: Vec::new(),
    }
}

#[tauri::command]
pub async fn set_input_viewer_state(app: AppHandle, visible: bool) -> Result<(), String> {
    if !visible {
        #[cfg(target_os = "windows")]
        WHEEL_CAPTURE_ACTIVE.store(false, std::sync::atomic::Ordering::Relaxed);
        if let Some(window) = app.get_webview_window(WINDOW_LABEL) {
            window
                .hide()
                .map_err(|error| format!("Impossible de masquer Input Viewer : {error}"))?;
        }
        let _ = app.emit("input-viewer:visibility-changed", false);
        return Ok(());
    }

    let config = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == WINDOW_LABEL)
        .ok_or_else(|| {
            "La fenêtre Input Viewer doit être définie dans tauri.conf.json.".to_owned()
        })?
        .clone();
    let window = if let Some(window) = app.get_webview_window(WINDOW_LABEL) {
        window
    } else {
        let window = WebviewWindowBuilder::from_config(&app, &config)
            .map_err(|error| format!("Impossible de préparer Input Viewer : {error}"))?
            .build()
            .map_err(|error| format!("Impossible de créer Input Viewer : {error}"))?;
        #[cfg(target_os = "windows")]
        if let Err(error) = window_vibrancy::apply_acrylic(&window, Some((13, 13, 14, 242))) {
            log::warn!("Le fond Acrylic d’Input Viewer n’est pas disponible : {error}");
        }
        window
    };

    position_window(&app, &window)?;
    window
        .show()
        .map_err(|error| format!("Impossible d’afficher Input Viewer : {error}"))?;
    #[cfg(target_os = "windows")]
    {
        WHEEL_CAPTURE_ACTIVE.store(true, std::sync::atomic::Ordering::Relaxed);
        start_wheel_hook();
    }
    let _ = app.emit("input-viewer:visibility-changed", true);
    Ok(())
}

fn position_window(app: &AppHandle, window: &WebviewWindow) -> Result<(), String> {
    let monitor = app
        .primary_monitor()
        .map_err(|error| format!("Impossible d’identifier l’écran principal : {error}"))?
        .or_else(|| app.available_monitors().ok()?.into_iter().next())
        .ok_or_else(|| "Aucun écran disponible pour afficher Input Viewer.".to_owned())?;
    let work = monitor.work_area();
    let scale = monitor.scale_factor();
    let width = (WINDOW_WIDTH * scale).round() as i32;
    let height = (WINDOW_HEIGHT * scale).round() as i32;
    let margin = (SCREEN_MARGIN * scale).round() as i32;
    let right = work
        .position
        .x
        .saturating_add(i32::try_from(work.size.width).unwrap_or(i32::MAX));
    let bottom = work
        .position
        .y
        .saturating_add(i32::try_from(work.size.height).unwrap_or(i32::MAX));
    let x = work
        .position
        .x
        .saturating_add(margin)
        .min(right.saturating_sub(width));
    let y = bottom
        .saturating_sub(height)
        .saturating_sub(margin)
        .max(work.position.y);
    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|error| format!("Impossible de placer Input Viewer : {error}"))
}

#[cfg(target_os = "windows")]
use std::{
    sync::atomic::{AtomicBool, AtomicI32, Ordering},
    thread,
};

#[cfg(target_os = "windows")]
static WHEEL_CAPTURE_ACTIVE: AtomicBool = AtomicBool::new(false);
#[cfg(target_os = "windows")]
static WHEEL_DELTA: AtomicI32 = AtomicI32::new(0);
#[cfg(target_os = "windows")]
static WHEEL_HOOK_STARTED: AtomicBool = AtomicBool::new(false);
#[cfg(target_os = "windows")]
static LAST_CURSOR_POSITION: Mutex<Option<(i32, i32)>> = Mutex::new(None);

#[cfg(target_os = "windows")]
fn start_wheel_hook() {
    if WHEEL_HOOK_STARTED.swap(true, Ordering::AcqRel) {
        return;
    }
    thread::spawn(|| unsafe {
        use std::ptr::{null, null_mut};
        use windows_sys::Win32::{
            System::LibraryLoader::GetModuleHandleW,
            UI::WindowsAndMessaging::{
                GetMessageW, MSG, PM_NOREMOVE, PeekMessageW, SetWindowsHookExW,
                UnhookWindowsHookEx, WH_MOUSE_LL,
            },
        };

        let mut message: MSG = std::mem::zeroed();
        PeekMessageW(&mut message, null_mut(), 0, 0, PM_NOREMOVE);
        let module = GetModuleHandleW(null());
        let hook = SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_hook), module, 0);
        if hook.is_null() {
            WHEEL_HOOK_STARTED.store(false, Ordering::Release);
            log::warn!("Le suivi local de la molette n’a pas pu être activé.");
            return;
        }
        loop {
            let result = GetMessageW(&mut message, null_mut(), 0, 0);
            if result <= 0 {
                break;
            }
        }
        UnhookWindowsHookEx(hook);
        WHEEL_HOOK_STARTED.store(false, Ordering::Release);
    });
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn mouse_hook(code: i32, message: usize, data: isize) -> isize {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, HC_ACTION, MSLLHOOKSTRUCT, WM_MOUSEWHEEL,
    };
    if code == HC_ACTION as i32
        && message == WM_MOUSEWHEEL as usize
        && WHEEL_CAPTURE_ACTIVE.load(Ordering::Relaxed)
    {
        let event = unsafe { &*(data as *const MSLLHOOKSTRUCT) };
        let delta = ((event.mouseData >> 16) as u16 as i16) as i32;
        WHEEL_DELTA.fetch_add(delta, Ordering::Relaxed);
    }
    unsafe { CallNextHookEx(std::ptr::null_mut(), code, message, data) }
}

#[cfg(target_os = "windows")]
fn windows_snapshot() -> InputViewerSnapshot {
    use windows_sys::Win32::{
        Foundation::POINT,
        UI::{
            Input::KeyboardAndMouse::{GetAsyncKeyState, VK_0, VK_LBUTTON, VK_MBUTTON, VK_RBUTTON},
            WindowsAndMessaging::{
                CURSOR_SHOWING, CURSORINFO, GetCursorInfo, GetCursorPos, GetSystemMetrics,
                SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN,
            },
        },
    };

    let mut cursor: CURSORINFO = unsafe { std::mem::zeroed() };
    cursor.cbSize = std::mem::size_of::<CURSORINFO>() as u32;
    let cursor_visible =
        unsafe { GetCursorInfo(&mut cursor) } != 0 && cursor.flags & CURSOR_SHOWING != 0;
    let mut point = POINT { x: 0, y: 0 };
    let has_position = unsafe { GetCursorPos(&mut point) } != 0;
    let x = if has_position { point.x } else { 0 };
    let y = if has_position { point.y } else { 0 };
    let left = unsafe { GetSystemMetrics(SM_XVIRTUALSCREEN) };
    let top = unsafe { GetSystemMetrics(SM_YVIRTUALSCREEN) };
    let width = unsafe { GetSystemMetrics(SM_CXVIRTUALSCREEN) }.max(1);
    let height = unsafe { GetSystemMetrics(SM_CYVIRTUALSCREEN) }.max(1);
    let (delta_x, delta_y) = LAST_CURSOR_POSITION
        .lock()
        .map(|mut previous| {
            let delta = previous
                .map(|(px, py)| (x.saturating_sub(px), y.saturating_sub(py)))
                .unwrap_or((0, 0));
            *previous = Some((x, y));
            delta
        })
        .unwrap_or((0, 0));

    let is_down = |key: i32| unsafe { GetAsyncKeyState(key) as u16 & 0x8000 != 0 };
    let mut pressed_keys = Vec::new();
    for (label, code) in [
        ('Q', 0x51),
        ('W', 0x57),
        ('E', 0x45),
        ('R', 0x52),
        ('T', 0x54),
        ('Y', 0x59),
        ('U', 0x55),
        ('I', 0x49),
        ('O', 0x4F),
        ('P', 0x50),
        ('A', 0x41),
        ('S', 0x53),
        ('D', 0x44),
        ('F', 0x46),
        ('G', 0x47),
        ('H', 0x48),
        ('J', 0x4A),
        ('K', 0x4B),
        ('L', 0x4C),
        ('Z', 0x5A),
        ('X', 0x58),
        ('C', 0x43),
        ('V', 0x56),
        ('B', 0x42),
        ('N', 0x4E),
        ('M', 0x4D),
    ] {
        if is_down(code) {
            pressed_keys.push(label.to_string());
        }
    }
    for digit in 0..10 {
        if is_down(VK_0 as i32 + digit) {
            pressed_keys.push(digit.to_string());
        }
    }
    for (label, code) in [
        ("Shift", 0x10),
        ("Ctrl", 0x11),
        ("Alt", 0x12),
        ("Space", 0x20),
        ("Tab", 0x09),
        ("Entrée", 0x0D),
        ("Échap", 0x1B),
        ("↑", 0x26),
        ("↓", 0x28),
        ("←", 0x25),
        ("→", 0x27),
    ] {
        if is_down(code) {
            pressed_keys.push(label.to_owned());
        }
    }
    let mut mouse_buttons = Vec::new();
    for (label, code) in [
        ("Left", VK_LBUTTON),
        ("Middle", VK_MBUTTON),
        ("Right", VK_RBUTTON),
    ] {
        if is_down(code as i32) {
            mouse_buttons.push(label.to_owned());
        }
    }
    InputViewerSnapshot {
        x,
        y,
        normalized_x: ((x - left) as f64 / width as f64).clamp(0.0, 1.0),
        normalized_y: ((y - top) as f64 / height as f64).clamp(0.0, 1.0),
        delta_x,
        delta_y,
        scroll_delta: WHEEL_DELTA.swap(0, Ordering::Relaxed),
        cursor_visible,
        mouse_buttons,
        pressed_keys,
    }
}
