use crate::commands::display::monitor_identifier;
use std::process::Command;
#[cfg(windows)]
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use tauri_plugin_store::StoreExt;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

// Record launch attempts before spawning so shutdown also handles startup races.
#[cfg(windows)]
static DOCK_LAUNCH_REQUESTED: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub async fn toggle_dock(app: AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    return launch_native_dock(&app, "--fxmp-toggle");

    #[cfg(not(windows))]
    {
        let _ = app;
        Err("Le dock Dock natif est disponible dans la version Windows.".to_owned())
    }
}

#[cfg(windows)]
fn launch_native_dock(app: &AppHandle, action: &str) -> Result<(), String> {
    let executable = native_dock_path(app)?;
    let mut command = Command::new(executable);
    command.arg("--fxmp-mode").arg(action);

    let selected_id = app
        .store("fxmp-settings.json")
        .ok()
        .and_then(|store| store.get("dockMonitorId"))
        .and_then(|value| value.as_str().map(str::to_owned))
        .unwrap_or_else(|| "primary".to_owned());
    let available = app
        .available_monitors()
        .map_err(|error| format!("Impossible de détecter les écrans : {error}"))?;
    let primary = app
        .primary_monitor()
        .map_err(|error| format!("Impossible d’identifier l’écran principal : {error}"))?
        .as_ref()
        .map(monitor_identifier)
        .unwrap_or_else(|| "primary".to_owned());
    let monitor_id = if selected_id == "primary"
        || available
            .iter()
            .any(|monitor| monitor_identifier(monitor) == selected_id)
    {
        selected_id
    } else {
        primary
    };
    command.arg(format!("--fxmp-monitor={monitor_id}"));

    command.creation_flags(CREATE_NO_WINDOW);
    DOCK_LAUNCH_REQUESTED.store(true, Ordering::Release);
    match command.spawn() {
        Ok(_) => Ok(()),
        Err(error) => {
            DOCK_LAUNCH_REQUESTED.store(false, Ordering::Release);
            Err(format!("Impossible de démarrer le dock Dock : {error}"))
        }
    }
}

#[cfg(windows)]
fn native_dock_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let bundled = app
        .path()
        .resource_dir()
        .map_err(|error| format!("Impossible de localiser les ressources : {error}"))?
        .join("third-party/dock/build/Release/dock.exe");
    if bundled.is_file() {
        return Ok(bundled);
    }

    let development = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("third-party/dock/build/Release/dock.exe");
    development
        .is_file()
        .then_some(development)
        .ok_or_else(|| "Dock n’est pas compilé. Reconstruisez l’application Windows.".to_owned())
}

#[tauri::command]
pub fn close_dock(app: AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    {
        // No dock was launched by this FXMP process: do not invoke the helper,
        // which otherwise waits up to 30 seconds for a nonexistent mutex.
        if !DOCK_LAUNCH_REQUESTED.load(Ordering::Acquire) {
            return Ok(());
        }
        let executable = native_dock_path(&app)?;
        let status = Command::new(executable)
            .args(["--fxmp-mode", "--fxmp-exit"])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|error| format!("Impossible d’arrêter le dock Dock : {error}"))?;
        if !status.success() {
            return Err("Le processus Dock n’a pas pu se fermer correctement.".to_owned());
        }
        DOCK_LAUNCH_REQUESTED.store(false, Ordering::Release);
        return Ok(());
    }

    #[cfg(not(windows))]
    {
        let _ = app;
        Ok(())
    }
}

#[tauri::command]
pub async fn open_dock_settings(app: AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    return launch_native_dock(&app, "--fxmp-settings");

    #[cfg(not(windows))]
    {
        let _ = app;
        Err("Les réglages Dock natifs sont disponibles dans la version Windows.".to_owned())
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
