use tauri::{AppHandle, Manager};

use crate::app_settings::{self, AppSettings};

#[tauri::command]
pub fn get_settings(app_handle: AppHandle) -> Result<AppSettings, String> {
    let path = app_settings::app_settings_path(
        app_handle.path().app_data_dir().map_err(|e| e.to_string())?,
    );
    app_settings::load(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_settings(settings: AppSettings, app_handle: AppHandle) -> Result<(), String> {
    let path = app_settings::app_settings_path(
        app_handle.path().app_data_dir().map_err(|e| e.to_string())?,
    );
    app_settings::save(&path, &settings).map_err(|e| e.to_string())
}
