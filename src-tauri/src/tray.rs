use tauri::{
    App, AppHandle, Emitter, Manager, Runtime,
    menu::{MenuBuilder, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

pub fn install(app: &mut App) -> tauri::Result<()> {
    let title = MenuItem::with_id(
        app,
        "tray-title",
        "FXMP OS · Centre de contrôle",
        false,
        None::<&str>,
    )?;
    let menu = MenuBuilder::new(app)
        .item(&title)
        .separator()
        .text("open", "Ouvrir le centre de contrôle")
        .separator()
        .text("navigate-overview", "Vue d’ensemble")
        .text("navigate-resources", "Ressources système")
        .text("navigate-applications", "Applications installées")
        .text("navigate-device", "Appareil Windows")
        .separator()
        .text("settings-application", "Paramètres · Application")
        .text("settings-overlay", "Paramètres · Overlay")
        .text("settings-notifications", "Paramètres · Notifications")
        .text("settings-theme", "Paramètres · Thème")
        .text("settings-updates", "Paramètres · Mises à jour")
        .separator()
        .text("about", "À propos de FXMP OS")
        .separator()
        .text("quit", "Quitter FXMP OS")
        .build()?;
    let icon = app
        .default_window_icon()
        .cloned()
        .expect("the Tauri app icon must be configured");

    TrayIconBuilder::new()
        .icon(icon)
        .tooltip("FXMP OS · Centre de contrôle PC")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                toggle_main_window(&app);
            }
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main_window(app),
            "about" => navigate_main_window(app, "/about/"),
            "navigate-overview" => navigate_main_window(app, "/"),
            "navigate-resources" => navigate_main_window(app, "/monitor/"),
            "navigate-applications" => navigate_main_window(app, "/apps/"),
            "navigate-device" => navigate_main_window(app, "/account/"),
            "settings-application" => navigate_main_window(app, "/settings/?tab=application"),
            "settings-overlay" => navigate_main_window(app, "/settings/?tab=overlay"),
            "settings-notifications" => navigate_main_window(app, "/settings/?tab=notifications"),
            "settings-theme" => navigate_main_window(app, "/settings/?tab=theme"),
            "settings-updates" => navigate_main_window(app, "/settings/?tab=updates"),
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

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

fn navigate_main_window<R: Runtime>(app: &AppHandle<R>, path: &str) {
    show_main_window(app);
    if let Err(error) = app.emit_to("main", "tray:navigate", path.to_owned()) {
        log::error!("failed to navigate from tray: {error}");
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
