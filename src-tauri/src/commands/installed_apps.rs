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
    icon_data_url: Option<String>,
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
                    icon_data_url,
                });
            }
        }
    }

    apps.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    apps
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
        DeleteDC, DeleteObject, HBITMAP, HGDIOBJ, SelectObject,
    };
    use windows_sys::Win32::UI::Shell::ExtractIconExW;
    use windows_sys::Win32::UI::WindowsAndMessaging::{DI_NORMAL, DestroyIcon, DrawIconEx, HICON};

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
        let mut rgba = Vec::with_capacity(pixel_count);
        for pixel in bgra.chunks_exact(4) {
            rgba.extend_from_slice(&[pixel[2], pixel[1], pixel[0], pixel[3]]);
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
