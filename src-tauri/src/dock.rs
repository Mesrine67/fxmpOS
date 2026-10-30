use std::sync::Mutex;
use tauri::{AppHandle, Manager, PhysicalPosition, State, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

const DOCK_LABEL: &str = "dock";
const DOCK_WIDTH: f64 = 360.0;
const DOCK_HEIGHT: f64 = 390.0;
const DOCK_BOTTOM_MARGIN: f64 = 24.0;

#[tauri::command]
pub async fn toggle_dock(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(DOCK_LABEL) {
        let visible = window
            .is_visible()
            .map_err(|error| format!("Impossible de lire l’état du dock : {error}"))?;
        if visible {
            return window
                .hide()
                .map_err(|error| format!("Impossible de masquer le dock : {error}"));
        }
        window
            .show()
            .map_err(|error| format!("Impossible d’afficher le dock : {error}"))?;
        return window
            .set_focus()
            .map_err(|error| format!("Impossible de donner le focus au dock : {error}"));
    }

    let monitor = app
        .primary_monitor()
        .map_err(|error| format!("Impossible de détecter l’écran principal : {error}"))?
        .or_else(|| app.available_monitors().ok()?.into_iter().next())
        .ok_or_else(|| "Aucun écran disponible pour afficher le dock.".to_owned())?;
    let work_area = monitor.work_area();
    let scale = monitor.scale_factor();
    let width = (DOCK_WIDTH * scale).round() as i32;
    let height = (DOCK_HEIGHT * scale).round() as i32;
    let margin = (DOCK_BOTTOM_MARGIN * scale).round() as i32;
    let work_width = i32::try_from(work_area.size.width).unwrap_or(i32::MAX);
    let work_bottom = work_area
        .position
        .y
        .saturating_add(i32::try_from(work_area.size.height).unwrap_or(i32::MAX));
    let x = work_area
        .position
        .x
        .saturating_add((work_width - width) / 2);
    let y = work_bottom.saturating_sub(height).saturating_sub(margin);
    let window_config = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == DOCK_LABEL)
        .ok_or_else(|| "La fenêtre dock doit être définie dans tauri.conf.json.".to_owned())?
        .clone();

    let window = WebviewWindowBuilder::from_config(&app, &window_config)
        .map_err(|error| format!("Impossible de préparer le dock : {error}"))?
        .build()
        .map_err(|error| format!("Impossible de créer le dock : {error}"))?;
    #[cfg(target_os = "windows")]
    if let Err(error) = window_vibrancy::apply_acrylic(&window, Some((27, 27, 29, 220))) {
        log::warn!("L’effet Acrylic natif du dock n’est pas disponible : {error}");
    }
    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|error| format!("Impossible de placer le dock : {error}"))?;
    let dock_window = window.clone();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Focused(false)) {
            let _ = dock_window.hide();
        }
    });
    window
        .show()
        .map_err(|error| format!("Impossible d’afficher le dock : {error}"))?;
    window
        .set_focus()
        .map_err(|error| format!("Impossible de donner le focus au dock : {error}"))
}

#[tauri::command]
pub async fn close_dock(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(DOCK_LABEL) {
        window
            .hide()
            .map_err(|error| format!("Impossible de masquer le dock : {error}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn set_dock_shortcut(
    app: AppHandle,
    current_shortcut: State<'_, Mutex<String>>,
    shortcut: String,
) -> Result<(), String> {
    let mut current = current_shortcut
        .lock()
        .map_err(|_| "Impossible de synchroniser le raccourci du dock.".to_owned())?;
    if *current == shortcut {
        return Ok(());
    }

    app.global_shortcut()
        .register(shortcut.as_str())
        .map_err(|error| format!("Ce raccourci ne peut pas être enregistré : {error}"))?;

    if !current.is_empty() {
        if let Err(error) = app.global_shortcut().unregister(current.as_str()) {
            let _ = app.global_shortcut().unregister(shortcut.as_str());
            return Err(format!(
                "Impossible de remplacer l’ancien raccourci : {error}"
            ));
        }
    }

    *current = shortcut;
    Ok(())
}
