use tauri::{
    App, AppHandle, Listener, Manager, PhysicalPosition, Rect, Runtime,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use tauri::{Position as DpiPosition, Size as DpiSize};

const TRAY_MENU_WIDTH: f64 = 260.0;
const TRAY_MENU_HEIGHT: f64 = 405.0;

pub fn install(app: &mut App) -> tauri::Result<()> {
    let icon = app
        .default_window_icon()
        .cloned()
        .expect("the Tauri app icon must be configured");

    let app_handle = app.handle().clone();
    app.listen("tray:quit", move |_| app_handle.exit(0));

    TrayIconBuilder::new()
        .icon(icon)
        .tooltip("FXMP OS · Centre de contrôle PC")
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } => toggle_main_window(&tray.app_handle()),
            TrayIconEvent::Click {
                button: MouseButton::Right,
                button_state: MouseButtonState::Up,
                rect,
                ..
            } => toggle_tray_menu(&tray.app_handle(), rect),
            _ => {}
        })
        .build(app)?;

    Ok(())
}

pub fn show_tray_menu<R: Runtime>(app: &AppHandle<R>, rect: Rect) {
    let Some(window) = app.get_webview_window("tray-menu") else {
        return;
    };

    if let Err(error) = position_tray_menu(&window, rect) {
        log::warn!("failed to position tray panel: {error}");
    }
    if let Err(error) = window.show() {
        log::error!("failed to show tray panel: {error}");
        return;
    }
    if let Err(error) = window.set_focus() {
        log::warn!("failed to focus tray panel: {error}");
    }
}

pub fn hide_tray_menu<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("tray-menu") {
        if let Err(error) = window.hide() {
            log::warn!("failed to hide tray panel: {error}");
        }
    }
}

fn toggle_tray_menu<R: Runtime>(app: &AppHandle<R>, rect: Rect) {
    let Some(window) = app.get_webview_window("tray-menu") else {
        return;
    };

    if window.is_visible().unwrap_or(false) {
        hide_tray_menu(app);
    } else {
        show_tray_menu(app, rect);
    }
}

fn position_tray_menu<R: Runtime>(
    window: &tauri::WebviewWindow<R>,
    tray_rect: Rect,
) -> tauri::Result<()> {
    let scale = window.scale_factor()?;
    let tray_position = match tray_rect.position {
        DpiPosition::Physical(position) => position,
        DpiPosition::Logical(position) => position.to_physical::<i32>(scale),
    };
    let tray_size = match tray_rect.size {
        DpiSize::Physical(size) => size,
        DpiSize::Logical(size) => size.to_physical::<u32>(scale),
    };
    let tray_x = tray_position.x;
    let tray_y = tray_position.y;
    let tray_width = tray_size.width as i32;
    let tray_height = tray_size.height as i32;
    let tray_center_x = tray_x + tray_width / 2;
    let tray_center_y = tray_y + tray_height / 2;

    let monitors = window.available_monitors()?;
    let monitor = monitors
        .iter()
        .find(|monitor| {
            let position = monitor.position();
            let size = monitor.size();
            tray_center_x >= position.x
                && tray_center_x < position.x + size.width as i32
                && tray_center_y >= position.y
                && tray_center_y < position.y + size.height as i32
        })
        .or_else(|| monitors.first());

    let scale_factor = monitor
        .map(|monitor| monitor.scale_factor())
        .unwrap_or_else(|| window.scale_factor().unwrap_or(1.0));
    let width = (TRAY_MENU_WIDTH * scale_factor).round() as i32;
    let height = (TRAY_MENU_HEIGHT * scale_factor).round() as i32;

    let (work_x, work_y, work_width, work_height) = monitor
        .map(|monitor| {
            let area = monitor.work_area();
            let position = area.position;
            let size = area.size;
            (
                position.x,
                position.y,
                size.width as i32,
                size.height as i32,
            )
        })
        .unwrap_or((0, 0, width, height));

    let max_x = (work_x + work_width - width).max(work_x);
    let max_y = (work_y + work_height - height).max(work_y);
    let x = (tray_x + tray_width - width).clamp(work_x, max_x);
    let work_center_y = work_y + work_height / 2;
    let opens_above = tray_center_y >= work_center_y;
    let desired_y = if opens_above {
        tray_y - height
    } else {
        tray_y + tray_height
    };
    let y = desired_y.clamp(work_y, max_y);

    window.set_position(PhysicalPosition::new(x, y))
}

pub fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = window.unminimize() {
            log::error!("failed to restore main window: {error}");
        }
        if let Err(error) = window.show() {
            log::error!("failed to show main window: {error}");
            return;
        }
        if let Err(error) = window.set_focus() {
            log::error!("failed to focus main window: {error}");
        }
    }
}

fn toggle_main_window<R: Runtime>(app: &AppHandle<R>) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let visible = match window.is_visible() {
        Ok(visible) => visible,
        Err(error) => {
            log::error!("failed to get main window visibility: {error}");
            return;
        }
    };
    let minimized = match window.is_minimized() {
        Ok(minimized) => minimized,
        Err(error) => {
            log::error!("failed to get main window minimized state: {error}");
            return;
        }
    };

    if visible && !minimized {
        if let Err(error) = window.hide() {
            log::error!("failed to hide main window from tray: {error}");
        }
    } else {
        show_main_window(app);
    }
}
