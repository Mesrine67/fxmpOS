use tauri::{Manager, Runtime, plugin::TauriPlugin};
use tauri_plugin_opener::OpenerExt;

fn safe_url_label(url: &tauri::Url) -> String {
    match url.scheme() {
        "http" | "https" => url.origin().ascii_serialization(),
        scheme => format!("{scheme}:[redacted]"),
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::<R>::new("external-navigation")
        .on_navigation(|webview, url| {
            let same_origin = webview.url().is_ok_and(|current| {
                current.scheme() == url.scheme()
                    && current.host_str() == url.host_str()
                    && current.port_or_known_default() == url.port_or_known_default()
            });
            let is_configured_dev_origin = cfg!(debug_assertions)
                && webview
                    .app_handle()
                    .config()
                    .build
                    .dev_url
                    .as_ref()
                    .is_some_and(|dev_url| {
                        dev_url.scheme() == url.scheme()
                            && dev_url.host_str() == url.host_str()
                            && dev_url.port_or_known_default() == url.port_or_known_default()
                    });

            if same_origin || is_configured_dev_origin {
                return true;
            }

            if matches!(url.scheme(), "http" | "https" | "mailto" | "tel") {
                let safe_label = safe_url_label(url);
                log::info!("opening external link in system browser: {safe_label}");
                if webview
                    .opener()
                    .open_url(url.as_str(), None::<&str>)
                    .is_err()
                {
                    log::warn!("failed to open external link for {safe_label}");
                }
            } else {
                log::warn!(
                    "blocked navigation to untrusted scheme or origin: {}",
                    safe_url_label(url)
                );
            }

            false
        })
        .build()
}
