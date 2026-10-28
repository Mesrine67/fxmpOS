use tauri::{
    App, AppHandle, Emitter, Manager, Runtime,
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
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
    let open = MenuItem::with_id(
        app,
        "open",
        "Ouvrir le centre de contrôle",
        true,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(app)?;

    let overview = MenuItem::with_id(
        app,
        "navigate-overview",
        "Vue d’ensemble",
        true,
        None::<&str>,
    )?;
    let resources = MenuItem::with_id(
        app,
        "navigate-resources",
        "Ressources système",
        true,
        None::<&str>,
    )?;
    let applications = MenuItem::with_id(
        app,
        "navigate-applications",
        "Applications installées",
        true,
        None::<&str>,
    )?;
    let device = MenuItem::with_id(
        app,
        "navigate-device",
        "Appareil Windows",
        true,
        None::<&str>,
    )?;
    let quick_access = Submenu::with_items(
        app,
        "Accès rapide",
        true,
        &[&overview, &resources, &applications, &device],
    )?;

    let app_settings = MenuItem::with_id(
        app,
        "settings-application",
        "Application",
        true,
        None::<&str>,
    )?;
    let overlay_settings =
        MenuItem::with_id(app, "settings-overlay", "Overlay", true, None::<&str>)?;
    let notification_settings = MenuItem::with_id(
        app,
        "settings-notifications",
        "Notifications",
        true,
        None::<&str>,
    )?;
    let theme_settings = MenuItem::with_id(app, "settings-theme", "Thème", true, None::<&str>)?;
    let update_settings =
        MenuItem::with_id(app, "settings-updates", "Mises à jour", true, None::<&str>)?;
    let settings = Submenu::with_items(
        app,
        "Paramètres",
        true,
        &[
            &app_settings,
            &overlay_settings,
            &notification_settings,
            &theme_settings,
            &update_settings,
        ],
    )?;

    let about = MenuItem::with_id(app, "about", "À propos de FXMP OS", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quitter FXMP OS", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &title,
            &separator,
            &open,
            &quick_access,
            &settings,
            &about,
            &quit,
        ],
    )?;
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
