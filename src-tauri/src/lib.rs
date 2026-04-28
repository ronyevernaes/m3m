mod commands;
pub mod frontmatter;
pub mod indexer;
mod models;
#[cfg(test)]
mod tests;

use std::path::PathBuf;
use std::sync::Mutex;

use notify::RecommendedWatcher;
use sqlx::SqlitePool;
use tauri::Manager;

pub struct VaultContext {
    pub vault_root: PathBuf,
    pub db: SqlitePool,
    /// Dropping this stops the notify watcher (RAII).
    pub _watcher: RecommendedWatcher,
}

pub struct AppState {
    pub vault: Mutex<Option<VaultContext>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState { vault: Mutex::new(None) })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::notes::list_notes,
            commands::notes::read_note,
            commands::notes::write_note,
            commands::notes::create_note,
            commands::vault::open_vault,
            commands::search::search_notes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
