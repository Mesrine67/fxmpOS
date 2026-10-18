use tauri::webview::PageLoadEvent;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_cli::CliExt;
use serde::Serialize;
use sysinfo::{CpuRefreshKind, Disks, MemoryRefreshKind, RefreshKind, System};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DiskSnapshot {
    name: String,
    mount_point: String,
    file_system: String,
    total_bytes: u64,
    available_bytes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemSnapshot {
    hostname: String,
    windows_user: Option<String>,
    platform: String,
    architecture: String,
    os_version: String,
    os_name: Option<String>,
    kernel_version: String,
    locale: Option<String>,
    cpu_name: Option<String>,
    cpu_frequency_mhz: Option<u64>,
    logical_processors: usize,
    physical_cores: Option<usize>,
    memory_total_bytes: u64,
    memory_used_bytes: u64,
    uptime_seconds: u64,
    disks: Vec<DiskSnapshot>,
}

#[tauri::command]
fn get_system_snapshot() -> SystemSnapshot {
    let system = System::new_with_specifics(
        RefreshKind::nothing()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything()),
    );
    let first_cpu = system.cpus().first();
    let cpu_name = first_cpu.map(|cpu| {
        let brand = cpu.brand().trim();
        if brand.is_empty() {
            cpu.name().to_owned()
        } else {
            brand.to_owned()
        }
    });
    let cpu_frequency_mhz = first_cpu.map(|cpu| cpu.frequency()).filter(|value| *value > 0);
    let disks = Disks::new_with_refreshed_list()
        .list()
        .iter()
        .map(|disk| DiskSnapshot {
            name: disk.name().to_string_lossy().into_owned(),
            mount_point: disk.mount_point().display().to_string(),
            file_system: disk.file_system().to_string_lossy().into_owned(),
            total_bytes: disk.total_space(),
            available_bytes: disk.available_space(),
        })
        .collect();

    SystemSnapshot {
        hostname: tauri_plugin_os::hostname(),
        windows_user: std::env::var("USERNAME").ok().filter(|value| !value.is_empty()),
        platform: tauri_plugin_os::platform().to_owned(),
        architecture: tauri_plugin_os::arch().to_owned(),
        os_version: tauri_plugin_os::version().to_string(),
        os_name: System::long_os_version(),
        kernel_version: System::kernel_long_version(),
        locale: tauri_plugin_os::locale(),
        cpu_name,
        cpu_frequency_mhz,
        logical_processors: system.cpus().len(),
        physical_cores: System::physical_core_count(),
        memory_total_bytes: system.total_memory(),
        memory_used_bytes: system.used_memory(),
        uptime_seconds: System::uptime(),
        disks,
    }
}
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn external_navigation_plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::<R>::new("external-navigation")
        .on_navigation(|webview, url| {
            let is_internal_host = matches!(
                url.host_str(),
                Some("localhost") | Some("127.0.0.1") | Some("tauri.localhost") | Some("::1")
            );
            let is_internal = url.scheme() == "tauri" || is_internal_host;
            if is_internal {
                return true;
            }
            let is_external_link = matches!(url.scheme(), "http" | "https" | "mailto" | "tel");
            if is_external_link {
                log::info!("opening external link in system browser: {}", url);
                let _ = webview.opener().open_url(url.as_str(), None::<&str>);
                return false;
            }
            true
        })
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .setup(|app| {
            match app.cli().matches() {
                // `matches` here is a Struct with { args, subcommand }.
                // `args` is `HashMap<String, ArgData>` where `ArgData` is a struct with { value, occurrences }.
                // `subcommand` is `Option<Box<SubcommandMatches>>` where `SubcommandMatches` is a struct with { name, matches }.
                Ok(matches) => {
                    println!("{:?}", matches)
                }
                Err(_) => {}
            }
            Ok(())
        })
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(external_navigation_plugin())
        .invoke_handler(tauri::generate_handler![greet, get_system_snapshot])
        .on_page_load(|webview, payload| {
            if webview.label() == "main" && matches!(payload.event(), PageLoadEvent::Finished) {
                log::info!("main webview finished loading");
                let _ = webview.window().show();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
