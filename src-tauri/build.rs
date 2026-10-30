fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "activate_main_window",
            "greet",
            "get_system_snapshot",
            "get_resource_sample",
            "get_network_endpoints",
            "get_installed_apps",
            "get_overlay_snapshot",
            "get_display_monitors",
            "set_overlay_state",
            "toggle_dock",
            "close_dock",
            "set_dock_shortcut",
            "measure_network_latency",
        ]),
    ))
    .expect("failed to build Tauri application metadata");
}
