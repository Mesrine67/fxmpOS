fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "greet",
            "get_system_snapshot",
            "get_overlay_snapshot",
            "get_display_monitors",
            "set_overlay_state",
        ]),
    ))
    .expect("failed to build Tauri application metadata");
}
