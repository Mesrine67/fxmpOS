mod commands;
mod navigation;
mod tray;
#[cfg(windows)]
mod windows_installer;

use tauri::{Manager, webview::PageLoadEvent};

#[tauri::command]
fn activate_main_window(app: tauri::AppHandle) {
    tray::show_main_window(&app);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let start_hidden = std::env::args().any(|argument| argument == "--background");

    let builder = tauri::Builder::default();

    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_single_instance::init(
            |app, _arguments, _working_directory| {
                tray::show_main_window(app);
            },
        ))
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .args(["--background"])
                .app_name("FXMP OS")
                .build(),
        );

    builder
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: None,
                    }),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                ])
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(navigation::init())
        .setup(move |app| {
            app.manage(commands::system::ResourceMonitor::new());
            let window_config = app
                .config()
                .app
                .windows
                .iter()
                .find(|window| window.label == "main")
                .expect("tauri.conf.json must define the main window")
                .clone();

            let main_window =
                tauri::WebviewWindowBuilder::from_config(app.handle(), &window_config)?
                    .on_page_load(move |window, payload| {
                        if window.label() == "main"
                            && matches!(payload.event(), PageLoadEvent::Finished)
                        {
                            log::info!("main webview finished loading");
                            if !start_hidden {
                                let _ = window.show();
                            }
                        }
                    })
                    .build()?;

            let tray_window_config = app
                .config()
                .app
                .windows
                .iter()
                .find(|window| window.label == "tray-menu")
                .expect("tauri.conf.json must define the tray-menu window")
                .clone();
            tauri::WebviewWindowBuilder::from_config(app.handle(), &tray_window_config)?.build()?;

            #[cfg(windows)]
            windows_installer::allow_restart_manager_shutdown(&main_window);

            #[cfg(desktop)]
            tray::install(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            activate_main_window,
            commands::greet::greet,
            commands::system::get_system_snapshot,
            commands::system::get_resource_sample,
            commands::system::get_network_endpoints,
            commands::installed_apps::get_installed_apps,
            commands::system::get_overlay_snapshot,
            commands::network::measure_network_latency,
            commands::display::get_display_monitors,
            commands::overlay::set_overlay_state
        ])
        .on_window_event(|window, event| {
            if window.label() == "tray-menu" && matches!(event, tauri::WindowEvent::Focused(false))
            {
                tray::hide_tray_menu(&window.app_handle());
            }

            if window.label() == "tray-menu" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    tray::hide_tray_menu(&window.app_handle());
                }
            }

            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    #[cfg(windows)]
                    if windows_installer::is_restart_manager_shutdown() {
                        return;
                    }

                    api.prevent_close();
                    if let Err(error) = window.hide() {
                        log::error!("failed to hide main window: {error}");
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
