#[tauri::command]
pub fn greet(name: String) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
}
