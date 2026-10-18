use serde::Deserialize;
use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindow, WebviewWindowBuilder};

use crate::commands::display::{monitor_identifier, overlay_positioning_supported};

const OVERLAY_LABEL: &str = "overlay";
const OVERLAY_WIDTH: f64 = 380.0;
const OVERLAY_HEIGHT: f64 = 104.0;
const OVERLAY_MARGIN: f64 = 16.0;

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OverlayAnchor {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
}
impl Default for OverlayAnchor {
    fn default() -> Self {
        Self::TopRight
    }
}

#[derive(Clone, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct OverlaySettings {
    enabled: bool,
    always_on_top: bool,
    click_through: bool,
    opacity_percent: u8,
    anchor: OverlayAnchor,
    monitor_id: Option<String>,
}

impl Default for OverlaySettings {
    fn default() -> Self {
        Self {
            enabled: false,
            always_on_top: true,
            click_through: false,
            opacity_percent: 92,
            anchor: OverlayAnchor::TopRight,
            monitor_id: None,
        }
    }
}

fn apply_overlay_settings(
    window: &WebviewWindow,
    settings: &OverlaySettings,
) -> Result<(), String> {
    #[cfg(desktop)]
    {
        window
            .set_always_on_top(settings.always_on_top)
            .map_err(|error| format!("Impossible de régler la priorité de l’overlay : {error}"))?;
        window
            .set_ignore_cursor_events(settings.click_through)
            .map_err(|error| format!("Impossible de régler le clic traversant : {error}"))?;
    }

    let monitors = window
        .available_monitors()
        .map_err(|error| format!("Impossible de détecter les écrans : {error}"))?;
    let primary = window
        .primary_monitor()
        .map_err(|error| format!("Impossible d’identifier l’écran principal : {error}"))?;
    let target = settings
        .monitor_id
        .as_deref()
        .and_then(|id| {
            monitors
                .iter()
                .find(|monitor| monitor_identifier(monitor) == id)
        })
        .or(primary.as_ref())
        .or_else(|| monitors.first())
        .ok_or_else(|| "Aucun écran disponible pour placer l’overlay.".to_owned())?;

    let work_area = target.work_area();
    let scale = target.scale_factor();
    let width = (OVERLAY_WIDTH * scale).round() as i32;
    let height = (OVERLAY_HEIGHT * scale).round() as i32;
    let margin = (OVERLAY_MARGIN * scale).round() as i32;
    let left = work_area.position.x.saturating_add(margin);
    let top = work_area.position.y.saturating_add(margin);
    let right = work_area
        .position
        .x
        .saturating_add(i32::try_from(work_area.size.width).unwrap_or(i32::MAX))
        .saturating_sub(width)
        .saturating_sub(margin);
    let bottom = work_area
        .position
        .y
        .saturating_add(i32::try_from(work_area.size.height).unwrap_or(i32::MAX))
        .saturating_sub(height)
        .saturating_sub(margin);
    let (x, y) = match settings.anchor {
        OverlayAnchor::TopLeft => (left, top),
        OverlayAnchor::TopRight => (right, top),
        OverlayAnchor::BottomLeft => (left, bottom),
        OverlayAnchor::BottomRight => (right, bottom),
    };

    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|error| format!("Impossible de placer l’overlay : {error}"))
}

fn validate_overlay_settings(app: &AppHandle, settings: &OverlaySettings) -> Result<(), String> {
    if !overlay_positioning_supported(app)? {
        return Err(
            "Le placement personnalisé de l’overlay n’est pas disponible sous Wayland. Utilisez une session X11 pour choisir l’écran et le coin.".into(),
        );
    }

    if !(35..=100).contains(&settings.opacity_percent) {
        return Err("L’opacité de l’overlay doit être comprise entre 35 et 100 %.".into());
    }

    Ok(())
}

/// Shows or hides the configured overlay. The command is async because creating
/// a WebView2 window from a synchronous Windows command can deadlock.
#[tauri::command]
pub async fn set_overlay_state(
    app: AppHandle,
    visible: bool,
    settings: OverlaySettings,
) -> Result<(), String> {
    if !visible || !settings.enabled {
        if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
            window
                .hide()
                .map_err(|error| format!("Impossible de masquer l’overlay : {error}"))?;
        }
        return Ok(());
    }

    // Validate before touching an existing window or creating the WebView.
    // In particular, Wayland does not support the global positioning used here.
    validate_overlay_settings(&app, &settings)?;

    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        apply_overlay_settings(&window, &settings)?;
        window
            .show()
            .map_err(|error| format!("Impossible d’afficher l’overlay : {error}"))?;
        return Ok(());
    }

    let window_config = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == OVERLAY_LABEL)
        .ok_or_else(|| "La fenêtre overlay doit être définie dans tauri.conf.json.".to_owned())?
        .clone();

    let window = WebviewWindowBuilder::from_config(&app, &window_config)
        .map_err(|error| format!("Impossible de préparer l’overlay : {error}"))?
        .build()
        .map_err(|error| format!("Impossible de créer l’overlay : {error}"))?;

    apply_overlay_settings(&window, &settings)?;
    window
        .show()
        .map_err(|error| format!("Impossible d’afficher l’overlay : {error}"))
}
