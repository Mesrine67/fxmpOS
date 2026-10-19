mod commands;
mod navigation;
mod tray;

use tauri::webview::PageLoadEvent;

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
        .plugin(tauri_plugin_process::init())
        .plugin(navigation::init())
        .setup(move |app| {
            let window_config = app
                .config()
                .app
                .windows
                .iter()
                .find(|window| window.label == "main")
                .expect("tauri.conf.json must define the main window")
                .clone();

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

            #[cfg(desktop)]
            tray::install(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::greet::greet,
            commands::system::get_system_snapshot,
            commands::installed_apps::get_installed_apps,
            commands::system::get_overlay_snapshot,
            commands::network::measure_network_latency,
            commands::display::get_display_monitors,
            commands::overlay::set_overlay_state
        ])
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
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
