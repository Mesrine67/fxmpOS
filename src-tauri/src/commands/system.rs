#[cfg(target_os = "windows")]
use serde::Deserialize;
use serde::Serialize;
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use sysinfo::{
    CpuRefreshKind, Disks, MemoryRefreshKind, Motherboard, ProcessRefreshKind, ProcessesToUpdate,
    Product, RefreshKind, System,
};

#[derive(Clone)]
pub struct ResourceMonitor {
    system: Arc<Mutex<System>>,
}

impl ResourceMonitor {
    pub fn new() -> Self {
        Self {
            system: Arc::new(Mutex::new(System::new_with_specifics(
                RefreshKind::nothing()
                    .with_cpu(CpuRefreshKind::everything())
                    .with_memory(MemoryRefreshKind::everything()),
            ))),
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceProcess {
    name: String,
    pid: String,
    cpu_percent: f32,
    memory_bytes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceSample {
    hostname: String,
    sampled_at_ms: u64,
    cpu_percent: f32,
    memory_total_bytes: u64,
    memory_used_bytes: u64,
    processes: Vec<ResourceProcess>,
    process_count: usize,
}

/// Samples live CPU, memory, and process usage locally. No process paths or command lines are returned.
#[tauri::command]
pub async fn get_resource_sample(
    monitor: tauri::State<'_, ResourceMonitor>,
) -> Result<ResourceSample, String> {
    let system = Arc::clone(&monitor.system);
    tauri::async_runtime::spawn_blocking(move || {
        let mut system = system
            .lock()
            .map_err(|_| "Le moniteur système est indisponible.".to_owned())?;
        system.refresh_cpu_all();
        system.refresh_memory();
        system.refresh_processes_specifics(
            ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::nothing().with_cpu().with_memory(),
        );

        let process_count = system.processes().len();
        let mut processes = system
            .processes()
            .iter()
            .map(|(pid, process)| ResourceProcess {
                name: process.name().to_string_lossy().into_owned(),
                pid: pid.to_string(),
                cpu_percent: process.cpu_usage(),
                memory_bytes: process.memory(),
            })
            .collect::<Vec<_>>();
        processes.sort_by(|left, right| right.cpu_percent.total_cmp(&left.cpu_percent));
        let mut selected_pids = processes
            .iter()
            .take(25)
            .map(|process| process.pid.clone())
            .collect::<HashSet<_>>();
        let mut top_processes = processes.iter().take(25).cloned().collect::<Vec<_>>();
        processes.sort_by(|left, right| right.memory_bytes.cmp(&left.memory_bytes));
        for process in processes {
            if top_processes.len() >= 50 {
                break;
            }
            if selected_pids.insert(process.pid.clone()) {
                top_processes.push(process);
            }
        }

        Ok(ResourceSample {
            hostname: tauri_plugin_os::hostname(),
            sampled_at_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            cpu_percent: system.global_cpu_usage().clamp(0.0, 100.0),
            memory_total_bytes: system.total_memory(),
            memory_used_bytes: system.used_memory(),
            processes: top_processes,
            process_count,
        })
    })
    .await
    .map_err(|error| format!("La lecture des ressources a échoué : {error}"))?
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskSnapshot {
    name: String,
    mount_point: String,
    file_system: String,
    total_bytes: u64,
    available_bytes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphicsAdapterSnapshot {
    name: String,
    manufacturer: Option<String>,
    video_processor: Option<String>,
    driver_version: Option<String>,
}

#[cfg(target_os = "windows")]
#[derive(Deserialize)]
#[serde(rename = "Win32_VideoController")]
#[serde(rename_all = "PascalCase")]
struct Win32VideoController {
    name: Option<String>,
    adapter_compatibility: Option<String>,
    video_processor: Option<String>,
    driver_version: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemSnapshot {
    hostname: String,
    windows_user: Option<String>,
    windows_domain: Option<String>,
    windows_profile_path: Option<String>,
    windows_session: Option<String>,
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
    computer_manufacturer: Option<String>,
    computer_model: Option<String>,
    computer_family: Option<String>,
    computer_version: Option<String>,
    motherboard_manufacturer: Option<String>,
    motherboard_model: Option<String>,
    motherboard_version: Option<String>,
    memory_total_bytes: u64,
    memory_used_bytes: u64,
    virtual_memory_total_bytes: u64,
    virtual_memory_used_bytes: u64,
    uptime_seconds: u64,
    disks: Vec<DiskSnapshot>,
    graphics_adapters: Option<Vec<GraphicsAdapterSnapshot>>,
}

fn clean_hardware_value(value: Option<String>) -> Option<String> {
    const PLACEHOLDERS: [&str; 6] = [
        "default string",
        "to be filled by o.e.m.",
        "to be filled by oem",
        "system product name",
        "system manufacturer",
        "unknown",
    ];

    let value = value?.trim().to_owned();
    let normalized = value.to_ascii_lowercase();

    if value.is_empty() || PLACEHOLDERS.contains(&normalized.as_str()) {
        None
    } else {
        Some(value)
    }
}

#[cfg(target_os = "windows")]
fn read_graphics_adapters() -> Option<Vec<GraphicsAdapterSnapshot>> {
    let connection = wmi::WMIConnection::new().ok()?;
    let controllers: Vec<Win32VideoController> = connection.query().ok()?;
    let mut adapters = controllers
        .into_iter()
        .filter_map(|controller| {
            Some(GraphicsAdapterSnapshot {
                name: clean_hardware_value(controller.name)?,
                manufacturer: clean_hardware_value(controller.adapter_compatibility),
                video_processor: clean_hardware_value(controller.video_processor),
                driver_version: clean_hardware_value(controller.driver_version),
            })
        })
        .collect::<Vec<_>>();

    adapters.sort_by(|left, right| left.name.cmp(&right.name));
    Some(adapters)
}

#[cfg(not(target_os = "windows"))]
fn read_graphics_adapters() -> Option<Vec<GraphicsAdapterSnapshot>> {
    None
}

/// Returns a read-only, typed snapshot of local machine details.
/// This command intentionally accepts no frontend-controlled paths or scripts.
#[tauri::command]
pub async fn get_system_snapshot() -> Result<SystemSnapshot, String> {
    tauri::async_runtime::spawn_blocking(read_system_snapshot)
        .await
        .map_err(|error| format!("La lecture des informations système a échoué : {error}"))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlaySnapshot {
    hostname: String,
    memory_total_bytes: u64,
    memory_used_bytes: u64,
    uptime_seconds: u64,
}

/// A lightweight local snapshot for the small overlay window.
#[tauri::command]
pub async fn get_overlay_snapshot() -> Result<OverlaySnapshot, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let system = System::new_with_specifics(
            RefreshKind::nothing().with_memory(MemoryRefreshKind::everything()),
        );

        OverlaySnapshot {
            hostname: tauri_plugin_os::hostname(),
            memory_total_bytes: system.total_memory(),
            memory_used_bytes: system.used_memory(),
            uptime_seconds: System::uptime(),
        }
    })
    .await
    .map_err(|error| format!("La lecture des mesures de l’overlay a échoué : {error}"))
}

fn read_system_snapshot() -> SystemSnapshot {
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
    let cpu_frequency_mhz = first_cpu
        .map(|cpu| cpu.frequency())
        .filter(|value| *value > 0);
    let (motherboard_manufacturer, motherboard_model, motherboard_version) = Motherboard::new()
        .map_or((None, None, None), |motherboard| {
            (
                clean_hardware_value(motherboard.vendor_name()),
                clean_hardware_value(motherboard.name()),
                clean_hardware_value(motherboard.version()),
            )
        });
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
        windows_user: std::env::var("USERNAME")
            .ok()
            .filter(|value| !value.is_empty()),
        windows_domain: std::env::var("USERDOMAIN")
            .ok()
            .filter(|value| !value.is_empty()),
        windows_profile_path: std::env::var("USERPROFILE")
            .ok()
            .filter(|value| !value.is_empty()),
        windows_session: std::env::var("SESSIONNAME")
            .ok()
            .filter(|value| !value.is_empty()),
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
        computer_manufacturer: clean_hardware_value(Product::vendor_name()),
        computer_model: clean_hardware_value(Product::name()),
        computer_family: clean_hardware_value(Product::family()),
        computer_version: clean_hardware_value(Product::version()),
        motherboard_manufacturer,
        motherboard_model,
        motherboard_version,
        memory_total_bytes: system.total_memory(),
        memory_used_bytes: system.used_memory(),
        virtual_memory_total_bytes: system.total_swap(),
        virtual_memory_used_bytes: system.used_swap(),
        uptime_seconds: System::uptime(),
        disks,
        graphics_adapters: read_graphics_adapters(),
    }
}
