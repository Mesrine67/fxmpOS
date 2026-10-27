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
    source: String,
    icon_data_url: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InventorySource {
    id: String,
    label: String,
    count: usize,
    available: bool,
    warning: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledAppsInventory {
    apps: Vec<InstalledApp>,
    sources: Vec<InventorySource>,
}

#[cfg(target_os = "windows")]
struct RegistryInventory {
    apps: Vec<InstalledApp>,
    warning: Option<String>,
}

#[cfg(target_os = "windows")]
fn read_registry_apps() -> RegistryInventory {
    use std::collections::HashSet;
    use winreg::RegKey;
    use winreg::enums::{
        HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_32KEY, KEY_WOW64_64KEY,
    };

    const UNINSTALL_KEY: &str = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall";

    let mut apps = Vec::new();
    let mut seen = HashSet::new();
    let mut read_failures = 0usize;
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
        let uninstall_key = match root.open_subkey_with_flags(UNINSTALL_KEY, flags) {
            Ok(key) => key,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
            Err(_) => {
                read_failures += 1;
                continue;
            }
        };
        let subkeys = match uninstall_key.enum_keys().collect::<Result<Vec<_>, _>>() {
            Ok(subkeys) => subkeys,
            Err(_) => {
                read_failures += 1;
                continue;
            }
        };

        for subkey in subkeys {
            let entry = match uninstall_key.open_subkey_with_flags(subkey, flags) {
                Ok(entry) => entry,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
                Err(_) => {
                    read_failures += 1;
                    continue;
                }
            };
            let name = match entry.get_value::<String, _>("DisplayName") {
                Ok(name) => name,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
                Err(_) => {
                    read_failures += 1;
                    continue;
                }
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
            let icon_data_url = entry
                .get_value::<String, _>("DisplayIcon")
                .ok()
                .and_then(|value| extract_display_icon_path(&value))
                .and_then(|(path, index)| {
                    extract_icon_data_url(std::path::Path::new(&path), index)
                });
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
                    source: "registry".to_owned(),
                    icon_data_url,
                });
            }
        }
    }

    apps.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    RegistryInventory {
        apps,
        warning: (read_failures > 0).then(|| {
            "Windows n’a pas permis de lire certaines entrées du registre; la liste des logiciels de bureau peut être incomplète.".to_owned()
        }),
    }
}

#[cfg(target_os = "windows")]
fn read_store_apps() -> Result<Vec<InstalledApp>, String> {
    use base64::Engine;
    use std::collections::HashSet;
    use windows::ApplicationModel::Core::AppListEntry;
    use windows::Foundation::Size;
    use windows::Management::Deployment::PackageManager;
    use windows::Storage::Streams::DataReader;
    use windows::Win32::System::WinRT::{RO_INIT_MULTITHREADED, RoInitialize, RoUninitialize};
    use windows::core::HSTRING;

    struct WinRtApartment;
    impl Drop for WinRtApartment {
        fn drop(&mut self) {
            unsafe { RoUninitialize() };
        }
    }

    unsafe { RoInitialize(RO_INIT_MULTITHREADED) }
        .map_err(|_| "Windows n’a pas pu initialiser l’inventaire des paquets.".to_owned())?;
    let _apartment = WinRtApartment;

    let manager = PackageManager::new()
        .map_err(|_| "Windows n’a pas pu ouvrir l’inventaire des paquets.".to_owned())?;
    let packages = manager
        .FindPackagesByUserSecurityId(&HSTRING::new())
        .map_err(|_| "Windows a refusé l’accès aux paquets de l’utilisateur courant.".to_owned())?;

    let mut apps = Vec::new();
    let mut seen = HashSet::new();
    for package in packages {
        let is_framework = package.IsFramework().unwrap_or(false);
        let is_resource_package = package.IsResourcePackage().unwrap_or(false);
        let is_optional = package.IsOptional().unwrap_or(false);
        if is_framework || is_resource_package || is_optional {
            continue;
        }

        let Ok(package_id) = package.Id() else {
            continue;
        };
        let Ok(full_name) = package_id.FullName() else {
            continue;
        };
        let package_identity = full_name.to_string_lossy();
        if !seen.insert(package_identity.clone()) {
            continue;
        }

        // Settings should show user-facing apps, not every framework, codec,
        // shell extension, or support package installed for this user.
        let Ok(entries) = package.GetAppListEntries() else {
            continue;
        };
        if entries.Size().unwrap_or(0) == 0 {
            continue;
        }

        let package_name = package_id
            .Name()
            .map(|value| value.to_string_lossy())
            .unwrap_or_default();
        let package_display_name = package
            .DisplayName()
            .map(|value| value.to_string_lossy())
            .ok()
            .filter(|value| !value.trim().is_empty() && !value.starts_with("ms-resource:"))
            .unwrap_or_else(|| package_name.clone());
        let version = package_id.Version().ok().map(|value| {
            format!(
                "{}.{}.{}.{}",
                value.Major, value.Minor, value.Build, value.Revision
            )
        });
        let publisher = package
            .PublisherDisplayName()
            .ok()
            .map(|value| value.to_string_lossy())
            .filter(|value| !value.trim().is_empty());

        for index in 0..entries.Size().unwrap_or(0) {
            let entry_result: windows::core::Result<AppListEntry> = entries.GetAt(index);
            let Ok(entry) = entry_result else {
                continue;
            };
            let app_id = entry
                .AppUserModelId()
                .map(|value| value.to_string_lossy())
                .unwrap_or_else(|_| format!("{package_identity}:{index}"));
            if !seen.insert(app_id) {
                continue;
            }
            let name = entry
                .DisplayInfo()
                .and_then(|display| display.DisplayName())
                .map(|value| value.to_string_lossy())
                .ok()
                .filter(|value| !value.trim().is_empty() && !value.starts_with("ms-resource:"))
                .unwrap_or_else(|| package_display_name.clone());
            if name.trim().is_empty() {
                continue;
            }
            let icon_data_url = entry
                .DisplayInfo()
                .and_then(|display| {
                    display.GetLogo(Size {
                        Width: 64.0,
                        Height: 64.0,
                    })
                })
                .and_then(|logo| logo.OpenReadAsync())
                .ok()
                .and_then(|operation| operation.join().ok())
                .and_then(|stream| {
                    let size = stream.Size().ok()?;
                    if size == 0 || size > 1024 * 1024 {
                        return None;
                    }
                    let reader =
                        DataReader::CreateDataReader(&stream.GetInputStreamAt(0).ok()?).ok()?;
                    reader.LoadAsync(size as u32).ok()?.join().ok()?;
                    let mut bytes = vec![0; size as usize];
                    reader.ReadBytes(&mut bytes).ok()?;
                    let mime_type = if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
                        "image/png"
                    } else if bytes.starts_with(b"\xff\xd8\xff") {
                        "image/jpeg"
                    } else {
                        return None;
                    };
                    Some(format!(
                        "data:{mime_type};base64,{}",
                        base64::engine::general_purpose::STANDARD.encode(bytes)
                    ))
                });
            apps.push(InstalledApp {
                name,
                publisher: publisher.clone(),
                version: version.clone(),
                install_date: None,
                estimated_size_bytes: None,
                scope: "Utilisateur courant".to_owned(),
                source: "store".to_owned(),
                icon_data_url,
            });
        }
    }

    apps.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    Ok(apps)
}

#[cfg(target_os = "windows")]
fn read_installed_apps() -> InstalledAppsInventory {
    let registry = read_registry_apps();
    let mut desktop_apps = registry.apps;
    let desktop_count = desktop_apps.len();
    let registry_source = InventorySource {
        id: "registry".to_owned(),
        label: "Logiciels de bureau".to_owned(),
        count: desktop_count,
        available: registry.warning.is_none(),
        warning: registry.warning,
    };
    let (store_apps, store_source) = match read_store_apps() {
        Ok(apps) => {
            let count = apps.len();
            (
                apps,
                InventorySource {
                    id: "store".to_owned(),
                    label: "Microsoft Store et MSIX".to_owned(),
                    count,
                    available: true,
                    warning: None,
                },
            )
        }
        Err(warning) => (
            Vec::new(),
            InventorySource {
                id: "store".to_owned(),
                label: "Microsoft Store et MSIX".to_owned(),
                count: 0,
                available: false,
                warning: Some(warning),
            },
        ),
    };

    desktop_apps.extend(store_apps);
    desktop_apps.sort_by(|left, right| {
        left.name
            .to_lowercase()
            .cmp(&right.name.to_lowercase())
            .then_with(|| left.source.cmp(&right.source))
    });

    InstalledAppsInventory {
        apps: desktop_apps,
        sources: vec![registry_source, store_source],
    }
}

#[cfg(target_os = "windows")]
fn extract_display_icon_path(value: &str) -> Option<(String, i32)> {
    let value = value.trim();
    if value.is_empty() {
        return None;
    }

    let (path, index) = if let Some(rest) = value.strip_prefix('"') {
        let end = rest.find('"')?;
        let path = &rest[..end];
        let suffix = rest[end + 1..].trim();
        let index = suffix
            .strip_prefix(',')
            .and_then(|index| index.trim().parse::<i32>().ok())
            .unwrap_or(0);
        (path, index)
    } else if let Some((path, index)) = value.rsplit_once(',') {
        match index.trim().parse::<i32>() {
            Ok(index) => (path.trim(), index),
            Err(_) => (value, 0),
        }
    } else {
        (value, 0)
    };

    (!path.is_empty()).then(|| (path.to_owned(), index))
}

#[cfg(target_os = "windows")]
fn extract_icon_data_url(path: &std::path::Path, icon_index: i32) -> Option<String> {
    use base64::Engine;
    use std::ffi::OsStr;
    use std::io::Cursor;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Graphics::Gdi::{
        BI_RGB, BITMAPINFO, BITMAPINFOHEADER, CreateCompatibleDC, CreateDIBSection, DIB_RGB_COLORS,
        DeleteDC, DeleteObject, GetDIBits, HBITMAP, HGDIOBJ, SelectObject,
    };
    use windows_sys::Win32::UI::Shell::ExtractIconExW;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        DI_NORMAL, DestroyIcon, DrawIconEx, GetIconInfo, HICON, ICONINFO,
    };

    const ICON_SIZE: i32 = 64;
    let path_string = path.to_str()?;
    let path_bytes = path_string.as_bytes();
    if path_bytes.get(1) != Some(&b':') || !matches!(path_bytes.get(2).copied(), Some(b'\\' | b'/'))
    {
        return None;
    }
    if !path.is_file() {
        return None;
    }
    let wide_path: Vec<u16> = OsStr::new(path_string)
        .encode_wide()
        .chain(Some(0))
        .collect();
    let mut icon: HICON = std::ptr::null_mut();

    // Registry paths stay inside the native process and are never returned to the UI.
    let extracted = unsafe {
        ExtractIconExW(
            wide_path.as_ptr(),
            icon_index,
            std::ptr::null_mut(),
            &mut icon,
            1,
        )
    };
    if extracted == 0 || icon.is_null() {
        return None;
    }

    let mut info = BITMAPINFO::default();
    info.bmiHeader = BITMAPINFOHEADER {
        biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
        biWidth: ICON_SIZE,
        biHeight: -ICON_SIZE,
        biPlanes: 1,
        biBitCount: 32,
        biCompression: BI_RGB,
        ..Default::default()
    };
    let mut pixels = std::ptr::null_mut();
    let dc = unsafe { CreateCompatibleDC(std::ptr::null_mut()) };
    let bitmap: HBITMAP = unsafe {
        CreateDIBSection(
            dc,
            &info,
            DIB_RGB_COLORS,
            &mut pixels,
            std::ptr::null_mut(),
            0,
        )
    };
    if dc.is_null() || bitmap.is_null() || pixels.is_null() {
        unsafe {
            if !bitmap.is_null() {
                DeleteObject(bitmap as HGDIOBJ);
            }
            if !dc.is_null() {
                DeleteDC(dc);
            }
            DestroyIcon(icon);
        }
        return None;
    }

    let previous = unsafe { SelectObject(dc, bitmap as HGDIOBJ) };
    let pixel_count = (ICON_SIZE * ICON_SIZE * 4) as usize;
    unsafe { std::ptr::write_bytes(pixels.cast::<u8>(), 0, pixel_count) };
    let drawn = unsafe {
        DrawIconEx(
            dc,
            0,
            0,
            icon,
            ICON_SIZE,
            ICON_SIZE,
            0,
            std::ptr::null_mut(),
            DI_NORMAL,
        )
    };

    let result = if drawn != 0 {
        let bgra = unsafe { std::slice::from_raw_parts(pixels.cast::<u8>(), pixel_count) };
        let mut icon_info = ICONINFO::default();
        let has_icon_info = unsafe { GetIconInfo(icon, &mut icon_info) } != 0;
        let mut mask = vec![0u8; pixel_count];
        let has_alpha_mask = if has_icon_info && !icon_info.hbmMask.is_null() {
            let mut mask_info = BITMAPINFO::default();
            mask_info.bmiHeader = BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: ICON_SIZE,
                biHeight: -ICON_SIZE,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB,
                ..Default::default()
            };
            let read_lines = unsafe {
                GetDIBits(
                    dc,
                    icon_info.hbmMask,
                    0,
                    ICON_SIZE as u32,
                    mask.as_mut_ptr().cast(),
                    &mut mask_info,
                    DIB_RGB_COLORS,
                )
            };
            if !icon_info.hbmColor.is_null() {
                unsafe { DeleteObject(icon_info.hbmColor as HGDIOBJ) };
            }
            unsafe { DeleteObject(icon_info.hbmMask as HGDIOBJ) };
            read_lines == ICON_SIZE && bgra.chunks_exact(4).all(|pixel| pixel[3] == 0)
        } else {
            if has_icon_info {
                if !icon_info.hbmColor.is_null() {
                    unsafe { DeleteObject(icon_info.hbmColor as HGDIOBJ) };
                }
                if !icon_info.hbmMask.is_null() {
                    unsafe { DeleteObject(icon_info.hbmMask as HGDIOBJ) };
                }
            }
            false
        };
        let mut rgba = Vec::with_capacity(pixel_count);
        for (index, pixel) in bgra.chunks_exact(4).enumerate() {
            let alpha = if has_alpha_mask {
                if mask[index * 4] == 0 { 255 } else { 0 }
            } else {
                pixel[3]
            };
            let unpremultiply = |channel: u8| {
                if alpha == 0 {
                    0
                } else {
                    ((u16::from(channel) * 255 / u16::from(alpha)).min(255)) as u8
                }
            };
            rgba.extend_from_slice(&[
                unpremultiply(pixel[2]),
                unpremultiply(pixel[1]),
                unpremultiply(pixel[0]),
                alpha,
            ]);
        }
        let mut png_bytes = Cursor::new(Vec::new());
        let encoded = (|| {
            let mut encoder = png::Encoder::new(&mut png_bytes, ICON_SIZE as u32, ICON_SIZE as u32);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder.write_header().ok()?;
            writer.write_image_data(&rgba).ok()?;
            Some(())
        })();
        encoded.map(|()| {
            format!(
                "data:image/png;base64,{}",
                base64::engine::general_purpose::STANDARD.encode(png_bytes.into_inner())
            )
        })
    } else {
        None
    };

    unsafe {
        if !previous.is_null() {
            SelectObject(dc, previous);
        }
        DeleteObject(bitmap as HGDIOBJ);
        DeleteDC(dc);
        DestroyIcon(icon);
    }
    result
}

#[cfg(not(target_os = "windows"))]
fn read_installed_apps() -> InstalledAppsInventory {
    InstalledAppsInventory {
        apps: Vec::new(),
        sources: Vec::new(),
    }
}

/// Lists desktop programs and current-user Store/MSIX packages through native Windows APIs.
/// It is read-only and never returns uninstall commands, paths, or package identifiers.
#[tauri::command]
pub async fn get_installed_apps() -> Result<InstalledAppsInventory, String> {
    #[cfg(not(target_os = "windows"))]
    return Err("La liste des applications est disponible uniquement sous Windows.".to_owned());

    #[cfg(target_os = "windows")]
    tauri::async_runtime::spawn_blocking(read_installed_apps)
        .await
        .map_err(|error| format!("La lecture des applications installées a échoué : {error}"))
}
