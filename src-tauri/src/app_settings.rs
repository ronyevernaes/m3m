use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub editor_font_size: String,
    pub restore_last_vault: bool,
    pub default_vault_location: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            editor_font_size: "medium".to_string(),
            restore_last_vault: true,
            default_vault_location: None,
        }
    }
}

pub fn load(path: &Path) -> anyhow::Result<AppSettings> {
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    let text = fs::read_to_string(path)?;
    let settings = serde_json::from_str(&text)?;
    Ok(settings)
}

pub fn save(path: &Path, settings: &AppSettings) -> anyhow::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let text = serde_json::to_string_pretty(settings)?;
    fs::write(path, text)?;
    Ok(())
}

pub fn app_settings_path(app_data_dir: PathBuf) -> PathBuf {
    app_data_dir.join("m3m").join("app-settings.json")
}
