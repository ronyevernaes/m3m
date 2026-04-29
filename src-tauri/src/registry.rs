use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    pub last_opened: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Registry {
    pub vaults: Vec<VaultEntry>,
    pub last_active_vault: Option<String>,
}

impl Default for Registry {
    fn default() -> Self {
        Self { vaults: Vec::new(), last_active_vault: None }
    }
}

pub fn load(path: &Path) -> anyhow::Result<Registry> {
    if !path.exists() {
        return Ok(Registry::default());
    }
    let text = fs::read_to_string(path)?;
    let registry = serde_json::from_str(&text)?;
    Ok(registry)
}

pub fn save(path: &Path, registry: &Registry) -> anyhow::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let text = serde_json::to_string_pretty(registry)?;
    fs::write(path, text)?;
    Ok(())
}

pub fn now_iso8601() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let (y, mo, d, h, mi, sec) = epoch_to_ymd_hms(secs);
    format!("{y:04}-{mo:02}-{d:02}T{h:02}:{mi:02}:{sec:02}Z")
}

fn epoch_to_ymd_hms(secs: u64) -> (u64, u64, u64, u64, u64, u64) {
    let sec = secs % 60;
    let mins = secs / 60;
    let min = mins % 60;
    let hours = mins / 60;
    let hour = hours % 24;
    let days_total = hours / 24;
    let (year, month, day) = days_to_ymd(days_total);
    (year, month, day, hour, min, sec)
}

fn days_to_ymd(mut days: u64) -> (u64, u64, u64) {
    days += 719468;
    let era = days / 146097;
    let doe = days % 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

/// Compute the registry path from the app data dir.
pub fn registry_path(app_data_dir: PathBuf) -> PathBuf {
    app_data_dir.join("m3m").join("registry.json")
}
