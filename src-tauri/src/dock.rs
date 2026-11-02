use crate::commands::display::monitor_identifier;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use tauri_plugin_store::StoreExt;

#[cfg(windows)]
fn configure_monitor(app: &AppHandle) -> Result<(), String> {
    let selected = app
        .store("fxmp-settings.json")
        .ok()
        .and_then(|store| store.get("dockMonitorId"))
        .and_then(|value| value.as_str().map(str::to_owned))
        .unwrap_or_else(|| "primary".into());

    let available = app.available_monitors().map_err(|e| e.to_string())?;
    let primary = app
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .as_ref()
        .map(monitor_identifier)
        .unwrap_or_else(|| "primary".into());
    let monitor = if selected == "primary"
        || available
            .iter()
            .any(|item| monitor_identifier(item) == selected)
    {
        selected
    } else {
        primary
    };
    tauri_plugin_dock::api::set_monitor(&monitor)
}

#[tauri::command]
pub async fn toggle_dock(app: AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    {
        configure_monitor(&app)?;
        tauri_plugin_dock::api::toggle()
    }
    #[cfg(not(windows))]
    {
        let _ = app;
        Err("Le dock natif est disponible uniquement sur Windows".into())
    }
}

#[tauri::command]
pub fn close_dock(_app: AppHandle) -> Result<(), String> {
    tauri_plugin_dock::api::close()
}

/// Transitional compatibility API; the FXMP settings UI no longer calls this.
#[tauri::command]
pub async fn open_dock_settings(_app: AppHandle) -> Result<(), String> {
    tauri_plugin_dock::api::open_settings()
}

#[cfg(desktop)]
pub fn handle_shortcut(app: AppHandle, state: tauri_plugin_global_shortcut::ShortcutState) {
    #[cfg(windows)]
    {
        let hold = tauri_plugin_dock::api::is_hold_mode();
        match (state, hold) {
            (tauri_plugin_global_shortcut::ShortcutState::Pressed, true) => {
                let _ = configure_monitor(&app);
                if let Err(error) = tauri_plugin_dock::api::show() {
                    log::warn!("Dock shortcut show failed: {error}");
                }
            }
            (tauri_plugin_global_shortcut::ShortcutState::Released, true) => {
                let _ = tauri_plugin_dock::api::hide();
            }
            (tauri_plugin_global_shortcut::ShortcutState::Pressed, false) => {
                let _ = configure_monitor(&app);
                if let Err(error) = tauri_plugin_dock::api::toggle() {
                    log::warn!("Dock shortcut toggle failed: {error}");
                }
            }
            _ => {}
        }
    }
    #[cfg(not(windows))]
    let _ = (app, state);
}

#[tauri::command]
pub fn set_dock_shortcut(
    app: AppHandle,
    current_shortcut: State<'_, std::sync::Mutex<String>>,
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
        .map_err(|e| format!("Ce raccourci ne peut pas être enregistré : {e}"))?;
    if !current.is_empty() {
        if let Err(error) = app.global_shortcut().unregister(current.as_str()) {
            let _ = app.global_shortcut().unregister(shortcut.as_str());
            return Err(format!(
                "Impossible de remplacer l'ancien raccourci : {error}"
            ));
        }
    }
    *current = shortcut;
    Ok(())
}
