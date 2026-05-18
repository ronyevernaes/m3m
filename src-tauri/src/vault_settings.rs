use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultSettings {
    pub autosave_delay_ms: u64,
    pub line_width: u32,
}

impl Default for VaultSettings {
    fn default() -> Self {
        Self { autosave_delay_ms: 2000, line_width: 80 }
    }
}

pub fn vault_settings_path(vault_root: &Path) -> PathBuf {
    vault_root.join(".vault").join("settings.json")
}

pub fn load(vault_root: &Path) -> anyhow::Result<VaultSettings> {
    let path = vault_settings_path(vault_root);
    if !path.exists() {
        return Ok(VaultSettings::default());
    }
    let text = fs::read_to_string(path)?;
    let settings = serde_json::from_str(&text)?;
    Ok(settings)
}

pub fn save(vault_root: &Path, settings: &VaultSettings) -> anyhow::Result<()> {
    let path = vault_settings_path(vault_root);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let text = serde_json::to_string_pretty(settings)?;
    fs::write(path, text)?;
    Ok(())
}
