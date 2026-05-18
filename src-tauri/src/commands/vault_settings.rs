use std::path::PathBuf;

use crate::vault_settings::{self, VaultSettings};

#[tauri::command]
pub fn get_vault_settings(vault_path: String) -> Result<VaultSettings, String> {
    vault_settings::load(&PathBuf::from(vault_path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_vault_settings(vault_path: String, settings: VaultSettings) -> Result<(), String> {
    vault_settings::save(&PathBuf::from(vault_path), &settings).map_err(|e| e.to_string())
}
