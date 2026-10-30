use crate::commands::display::monitor_identifier;
use std::process::Command;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use tauri_plugin_store::StoreExt;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[tauri::command]
pub async fn toggle_dock(app: AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    return launch_native_doludock(&app, "--fxmp-toggle");

    #[cfg(not(windows))]
    {
        let _ = app;
        Err("Le dock DoluDock natif est disponible dans la version Windows.".to_owned())
    }
}

#[cfg(windows)]
fn launch_native_doludock(app: &AppHandle, action: &str) -> Result<(), String> {
    let executable = native_doludock_path(app)?;
    let mut command = Command::new(executable);
    command.arg("--fxmp-mode").arg(action);

    let selected_id = app
        .store("fxmp-settings.json")
        .ok()
        .and_then(|store| store.get("dockMonitorId"))
        .and_then(|value| value.as_str().map(str::to_owned))
        .filter(|id| id != "primary");

    if let Some(id) = selected_id {
        let available = app
            .available_monitors()
            .map_err(|error| format!("Impossible de détecter les écrans : {error}"))?;
        if available
            .iter()
            .any(|monitor| monitor_identifier(monitor) == id)
        {
            command.arg(format!("--fxmp-monitor={id}"));
        }
    }

    command.creation_flags(CREATE_NO_WINDOW);
    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Impossible de démarrer le dock DoluDock : {error}"))
}

#[cfg(windows)]
fn native_doludock_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let bundled = app
        .path()
        .resource_dir()
        .map_err(|error| format!("Impossible de localiser les ressources : {error}"))?
        .join("third-party/doludock/build/Release/doludock.exe");
    if bundled.is_file() {
        return Ok(bundled);
    }

    let development = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("third-party/doludock/build/Release/doludock.exe");
    development.is_file().then_some(development).ok_or_else(|| {
        "DoluDock n’est pas compilé. Reconstruisez l’application Windows.".to_owned()
    })
}

#[tauri::command]
pub async fn close_dock(app: AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    return launch_native_doludock(&app, "--fxmp-hide");

    #[cfg(not(windows))]
    {
        let _ = app;
        Ok(())
    }
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
