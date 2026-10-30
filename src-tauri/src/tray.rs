use tauri::{
    App, AppHandle, Emitter, Manager, Runtime,
    menu::MenuBuilder,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

pub fn install(app: &mut App) -> tauri::Result<()> {
    let icon = app
        .default_window_icon()
        .cloned()
        .expect("the Tauri app icon must be configured");

    // Follow OpenClaw Desktop's Tauri tray implementation: use Tauri's native
    // menu instead of drawing a simulated tray flyout in a WebView.
    let menu = MenuBuilder::new(app)
        .text("open", "Ouvrir FXMP OS")
        .separator()
        .text("overview", "Vue d’ensemble")
        .text("resources", "Ressources système")
        .text("applications", "Applications installées")
        .text("device", "Appareil Windows")
        .separator()
        .text("settings-app", "Paramètres · Application")
        .text("settings-overlay", "Paramètres · Overlay")
        .text("settings-notifications", "Paramètres · Notifications")
        .text("settings-theme", "Paramètres · Thème")
        .text("settings-updates", "Paramètres · Mises à jour")
        .separator()
        .text("about", "À propos de FXMP OS")
        .separator()
        .text("quit", "Quitter FXMP OS")
        .build()?;

    let mut tray_builder = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("FXMP OS · Centre de contrôle PC")
        .show_menu_on_left_click(false);

    tray_builder = tray_builder.on_menu_event(|app, event| {
        let destination = match event.id().as_ref() {
            "open" | "overview" => Some("/"),
            "resources" => Some("/monitor/"),
            "applications" => Some("/apps/"),
            "device" => Some("/account/"),
            "settings-app" => Some("/settings/?tab=application"),
            "settings-overlay" => Some("/settings/?tab=overlay"),
            "settings-notifications" => Some("/settings/?tab=notifications"),
            "settings-theme" => Some("/settings/?tab=theme"),
            "settings-updates" => Some("/settings/?tab=updates"),
            "about" => Some("/about/"),
            "quit" => {
                app.exit(0);
                None
            }
            _ => None,
        };

        if let Some(destination) = destination {
            show_main_window(app);
            if let Err(error) = app.emit_to("main", "tray:navigate", destination) {
                log::error!("failed to navigate from the native tray menu: {error}");
            }
        }
    });

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

    tray_builder.build(app)?;

    Ok(())
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
