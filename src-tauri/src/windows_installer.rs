use std::sync::atomic::{AtomicBool, Ordering};

use tauri::WebviewWindow;
use windows_sys::Win32::{
    Foundation::{HWND, LPARAM, LRESULT, WPARAM},
    UI::{
        Shell::{DefSubclassProc, SetWindowSubclass},
        WindowsAndMessaging::{ENDSESSION_CLOSEAPP, WM_ENDSESSION, WM_QUERYENDSESSION},
    },
};

static RESTART_MANAGER_SHUTDOWN: AtomicBool = AtomicBool::new(false);
const SUBCLASS_ID: usize = 0x4658_4D50;

pub fn allow_restart_manager_shutdown(window: &WebviewWindow) {
    let hwnd = match window.hwnd() {
        Ok(hwnd) => hwnd,
        Err(error) => {
            log::error!("could not get the main window handle for installer shutdown: {error}");
            return;
        }
    };

    // Restart Manager sends WM_QUERYENDSESSION before WM_CLOSE when an installer
    // needs to replace an application that is still running. The normal close
    // handler hides FXMP OS in the tray, so this subclass marks the system-driven
    // shutdown and lets that close request reach Tauri instead.
    let installed = unsafe {
        SetWindowSubclass(
            hwnd.0 as HWND,
            Some(restart_manager_window_proc),
            SUBCLASS_ID,
            0,
        )
    };

    if installed == 0 {
        log::error!("could not register the Windows Restart Manager message handler");
    }
}

pub fn is_restart_manager_shutdown() -> bool {
    RESTART_MANAGER_SHUTDOWN.load(Ordering::SeqCst)
}

unsafe extern "system" fn restart_manager_window_proc(
    hwnd: HWND,
    message: u32,
    wparam: WPARAM,
    lparam: LPARAM,
    _subclass_id: usize,
    _reference_data: usize,
) -> LRESULT {
    let close_app = (lparam as u32 & ENDSESSION_CLOSEAPP) != 0;

    match message {
        WM_QUERYENDSESSION if close_app => {
            RESTART_MANAGER_SHUTDOWN.store(true, Ordering::SeqCst);
        }
        WM_ENDSESSION if close_app => {
            RESTART_MANAGER_SHUTDOWN.store(wparam != 0, Ordering::SeqCst);
        }
        _ => {}
    }

    unsafe { DefSubclassProc(hwnd, message, wparam, lparam) }
}
