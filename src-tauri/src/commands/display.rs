#[cfg(target_os = "linux")]
use std::{sync::mpsc, time::Duration};

use serde::Serialize;
use tauri::{AppHandle, WebviewWindow, window::Monitor};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayMonitorSnapshot {
    id: String,
    name: Option<String>,
    position_x: i32,
    position_y: i32,
    width: u32,
    height: u32,
    work_area_x: i32,
    work_area_y: i32,
    work_area_width: u32,
    work_area_height: u32,
    scale_factor: f64,
    primary: bool,
}

pub(crate) fn monitor_identifier(monitor: &Monitor) -> String {
    let position = monitor.position();
    let size = monitor.size();
    format!(
        "{}:{}:{}:{}",
        position.x, position.y, size.width, size.height
    )
}

pub(crate) fn overlay_positioning_supported(app: &AppHandle) -> Result<bool, String> {
    #[cfg(target_os = "linux")]
    {
        let (sender, receiver) = mpsc::sync_channel(1);
        app.run_on_main_thread(move || {
            use gdk::prelude::*;

            let supported = gdk::Display::default()
                .map(|display| display.backend())
                .is_some_and(|backend| supports_global_window_positioning(Some(backend)));
            let _ = sender.send(supported);
        })
        .map_err(|error| format!("Impossible de détecter le backend graphique : {error}"))?;

        return receiver
            .recv_timeout(Duration::from_secs(5))
            .map_err(|error| format!("La détection du backend graphique a expiré : {error}"));
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = app;
        Ok(true)
    }
}

#[cfg(target_os = "linux")]
fn supports_global_window_positioning(selected_backend: Option<gdk::Backend>) -> bool {
    selected_backend.is_some_and(|backend| backend.is_x11())
}

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::supports_global_window_positioning;
    use gdk::Backend;

    #[test]
    fn detects_wayland_from_the_selected_gdk_backend() {
        assert!(!supports_global_window_positioning(Some(Backend::Wayland)));
        assert!(supports_global_window_positioning(Some(Backend::X11)));
        assert!(!supports_global_window_positioning(None));
    }
}

/// Returns local monitor geometry only; no hardware serials or display EDIDs.
#[tauri::command]
pub async fn get_display_monitors(
    window: WebviewWindow,
) -> Result<Vec<DisplayMonitorSnapshot>, String> {
    let monitors = window
        .available_monitors()
        .map_err(|error| format!("Impossible de détecter les écrans : {error}"))?;
    let primary_id = window
        .primary_monitor()
        .map_err(|error| format!("Impossible d’identifier l’écran principal : {error}"))?
        .as_ref()
        .map(monitor_identifier);

    Ok(monitors
        .iter()
        .map(|monitor| {
            let position = monitor.position();
            let size = monitor.size();
            let work_area = monitor.work_area();
            let id = monitor_identifier(monitor);

            DisplayMonitorSnapshot {
                primary: primary_id.as_deref() == Some(id.as_str()),
                id,
                name: monitor.name().cloned(),
                position_x: position.x,
                position_y: position.y,
                width: size.width,
                height: size.height,
                work_area_x: work_area.position.x,
                work_area_y: work_area.position.y,
                work_area_width: work_area.size.width,
                work_area_height: work_area.size.height,
                scale_factor: monitor.scale_factor(),
            }
        })
        .collect())
}
