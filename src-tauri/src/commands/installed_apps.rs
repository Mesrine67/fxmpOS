use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledApp {
    name: String,
    publisher: Option<String>,
    version: Option<String>,
    install_date: Option<String>,
    estimated_size_bytes: Option<u64>,
    scope: String,
}

#[cfg(target_os = "windows")]
fn read_installed_apps() -> Vec<InstalledApp> {
    use std::collections::HashSet;
    use winreg::RegKey;
    use winreg::enums::{
        HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_32KEY, KEY_WOW64_64KEY,
    };

    const UNINSTALL_KEY: &str = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall";

    let mut apps = Vec::new();
    let mut seen = HashSet::new();
    let roots = [
        (
            RegKey::predef(HKEY_LOCAL_MACHINE),
            KEY_READ | KEY_WOW64_64KEY,
            "Tous les utilisateurs",
        ),
        (
            RegKey::predef(HKEY_LOCAL_MACHINE),
            KEY_READ | KEY_WOW64_32KEY,
            "Tous les utilisateurs",
        ),
        (
            RegKey::predef(HKEY_CURRENT_USER),
            KEY_READ | KEY_WOW64_64KEY,
            "Utilisateur courant",
        ),
        (
            RegKey::predef(HKEY_CURRENT_USER),
            KEY_READ | KEY_WOW64_32KEY,
            "Utilisateur courant",
        ),
    ];

    for (root, flags, scope) in roots {
        let Ok(uninstall_key) = root.open_subkey_with_flags(UNINSTALL_KEY, flags) else {
            continue;
        };
        let Ok(subkeys) = uninstall_key.enum_keys().collect::<Result<Vec<_>, _>>() else {
            continue;
        };

        for subkey in subkeys {
            let Ok(entry) = uninstall_key.open_subkey_with_flags(subkey, flags) else {
                continue;
            };
            let Ok(name) = entry.get_value::<String, _>("DisplayName") else {
                continue;
            };
            if name.trim().is_empty()
                || entry.get_value::<u32, _>("SystemComponent").unwrap_or(0) == 1
            {
                continue;
            }

            let publisher = entry
                .get_value::<String, _>("Publisher")
                .ok()
                .filter(|value| !value.trim().is_empty());
            let version = entry
                .get_value::<String, _>("DisplayVersion")
                .ok()
                .filter(|value| !value.trim().is_empty());
            let install_date = entry
                .get_value::<String, _>("InstallDate")
                .ok()
                .and_then(|value| {
                    (value.len() == 8 && value.bytes().all(|byte| byte.is_ascii_digit()))
                        .then(|| format!("{}-{}-{}", &value[..4], &value[4..6], &value[6..]))
                });
            let estimated_size_bytes = entry
                .get_value::<u32, _>("EstimatedSize")
                .ok()
                .map(|size| u64::from(size) * 1024);
            let identity = format!(
                "{}|{}|{}|{}",
                name.to_lowercase(),
                publisher.as_deref().unwrap_or_default().to_lowercase(),
                version.as_deref().unwrap_or_default(),
                scope
            );
            if seen.insert(identity) {
                apps.push(InstalledApp {
                    name: name.trim().to_owned(),
                    publisher,
                    version,
                    install_date,
                    estimated_size_bytes,
                    scope: scope.to_owned(),
                });
            }
        }
    }

    apps.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    apps
}

#[cfg(not(target_os = "windows"))]
fn read_installed_apps() -> Vec<InstalledApp> {
    Vec::new()
}

/// Lists installed desktop programs from the Windows uninstall registry keys.
/// It is read-only and never returns uninstall commands, paths, or identifiers.
#[tauri::command]
pub async fn get_installed_apps() -> Result<Vec<InstalledApp>, String> {
    #[cfg(not(target_os = "windows"))]
    return Err("La liste des applications est disponible uniquement sous Windows.".to_owned());

    #[cfg(target_os = "windows")]
    tauri::async_runtime::spawn_blocking(read_installed_apps)
        .await
        .map_err(|error| format!("La lecture des applications installées a échoué : {error}"))
}
