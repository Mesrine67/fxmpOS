use tauri::{
    App, AppHandle, Listener, Manager, PhysicalPosition, Runtime,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

const TRAY_PANEL_WIDTH: f64 = 320.0;
const TRAY_PANEL_HEIGHT: f64 = 500.0;

pub fn install(app: &mut App) -> tauri::Result<()> {
    let panel_config = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == "tray-panel")
        .ok_or(tauri::Error::WindowNotFound)?
        .clone();
    let panel = tauri::WebviewWindowBuilder::from_config(app.handle(), &panel_config)?.build()?;
    #[cfg(target_os = "windows")]
    if let Err(error) = window_vibrancy::apply_acrylic(&panel, Some((32, 32, 34, 232))) {
        log::warn!("L’effet Acrylic du panneau tray n’est pas disponible : {error}");
    }
    let panel_to_hide = panel.clone();
    panel.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Focused(false)) {
            let _ = panel_to_hide.hide();
        }
    });

    let icon = app
        .default_window_icon()
        .cloned()
        .expect("the Tauri app icon must be configured");

    let app_handle = app.handle().clone();
    app.listen("tray:quit", move |_| app_handle.exit(0));

    let mut tray_builder = TrayIconBuilder::new()
        .icon(icon)
        .tooltip("FXMP OS · Centre de contrôle PC")
        .show_menu_on_left_click(false);

    #[cfg(target_os = "windows")]
    {
        tray_builder = tray_builder.on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                position,
                button: MouseButton::Right,
                button_state: MouseButtonState::Up,
                ..
            } => {
                let app = tray.app_handle();
                if let Err(error) = toggle_tray_panel(&app, position.x, position.y) {
                    log::error!("failed to open the tray companion panel: {error}");
                }
            }
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } => {
                let app = tray.app_handle();
                toggle_main_window(&app);
            }
            _ => {}
        });
    }

    #[cfg(not(target_os = "windows"))]
    {
        tray_builder = tray_builder.on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                toggle_main_window(&app);
            }
        });
    }

    tray_builder.build(app)?;

    Ok(())
}

fn toggle_tray_panel<R: Runtime>(
    app: &AppHandle<R>,
    anchor_x: f64,
    anchor_y: f64,
) -> tauri::Result<()> {
    let panel = app
        .get_webview_window("tray-panel")
        .ok_or_else(|| tauri::Error::WindowNotFound)?;
    if panel.is_visible()? {
        return panel.hide();
    }

    let monitor = app
        .monitor_from_point(anchor_x, anchor_y)?
        .or(app.primary_monitor()?)
        .ok_or_else(|| tauri::Error::WindowNotFound)?;
    let work_area = monitor.work_area();
    let scale = monitor.scale_factor();
    let width = (TRAY_PANEL_WIDTH * scale).round() as i32;
    let height = (TRAY_PANEL_HEIGHT * scale).round() as i32;
    let left = work_area.position.x;
    let top = work_area.position.y;
    let right = left.saturating_add(i32::try_from(work_area.size.width).unwrap_or(i32::MAX));
    let bottom = top.saturating_add(i32::try_from(work_area.size.height).unwrap_or(i32::MAX));
    // Port of OpenClaw Windows Hub's MenuPositioner.CalculatePosition:
    // https://github.com/openclaw/openclaw-windows-node/blob/4cbbe51c45a7653e75ecf7d85481d7014b7e374b/src/OpenClaw.Shared/MenuPositioner.cs
    // prefer above the cursor, fall below only when the work area requires it,
    // and clamp to the monitor work area (excluding the taskbar).
    let max_x = right.saturating_sub(width).max(left);
    let x = (anchor_x.round() as i32).clamp(left, max_x);
    let max_y = bottom.saturating_sub(height).max(top);
    let y_above = (anchor_y.round() as i32).saturating_sub(height + 8);
    let y_below = (anchor_y.round() as i32).saturating_add(8);
    let y = if y_above >= top {
        y_above.min(max_y)
    } else if y_below <= max_y {
        y_below.max(top)
    } else {
        y_above.clamp(top, max_y)
    };

    panel.set_position(PhysicalPosition::new(x, y))?;
    panel.show()?;
    panel.set_focus()
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
