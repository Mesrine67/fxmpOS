use tauri::{
    App, AppHandle, Manager, Runtime,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

pub fn install(app: &mut App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Ouvrir FXMP OS", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quitter FXMP OS", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &separator, &quit])?;
    let icon = app
        .default_window_icon()
        .cloned()
        .expect("the Tauri app icon must be configured");

    TrayIconBuilder::new()
        .icon(icon)
        .tooltip("FXMP OS")
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
