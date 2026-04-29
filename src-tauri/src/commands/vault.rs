use std::fs;
use std::path::PathBuf;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use tauri::Emitter;
use tauri::Manager;
use tokio::sync::mpsc::unbounded_channel;

use crate::{AppState, VaultContext, indexer};
use crate::registry::{self, VaultEntry, registry_path, now_iso8601};

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct VaultList {
    pub vaults: Vec<VaultEntry>,
    pub last_active_vault: Option<String>,
}

// ---------------------------------------------------------------------------
// Existing command (updated to also persist last_opened in registry)
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn open_vault(
    vault_path: String,
    state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<usize, String> {
    let root = PathBuf::from(&vault_path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {vault_path}"));
    }

    let vault_dir = root.join(".vault");
    fs::create_dir_all(&vault_dir)
        .map_err(|e| format!("Cannot create .vault dir: {e}"))?;

    let pool = indexer::open_db(&root).await.map_err(|e| e.to_string())?;
    let count = indexer::index_vault(&pool, &root).await.map_err(|e| e.to_string())?;
    let watcher = start_watcher(root.clone(), pool.clone(), app_handle.clone())
        .map_err(|e| e.to_string())?;

    let ctx = VaultContext { vault_root: root, db: pool, _watcher: watcher };
    *state.vault.lock().unwrap() = Some(ctx);

    // Update last_opened and last_active_vault in registry (best-effort).
    let reg_path = registry_path(
        app_handle.path().app_data_dir().map_err(|e| e.to_string())?,
    );
    if let Ok(mut reg) = registry::load(&reg_path) {
        let now = now_iso8601();
        let mut found = false;
        for entry in &mut reg.vaults {
            if entry.path == vault_path {
                entry.last_opened = now.clone();
                reg.last_active_vault = Some(entry.id.clone());
                found = true;
                break;
            }
        }
        if found {
            let _ = registry::save(&reg_path, &reg);
        }
    }

    Ok(count)
}

// ---------------------------------------------------------------------------
// New vault management commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn list_vaults(app_handle: tauri::AppHandle) -> Result<VaultList, String> {
    let reg_path = registry_path(
        app_handle.path().app_data_dir().map_err(|e| e.to_string())?,
    );
    let reg = registry::load(&reg_path).map_err(|e| e.to_string())?;
    Ok(VaultList { vaults: reg.vaults, last_active_vault: reg.last_active_vault })
}

#[tauri::command]
pub async fn create_vault(
    name: String,
    path: String,
    color: String,
    app_handle: tauri::AppHandle,
) -> Result<VaultEntry, String> {
    let root = PathBuf::from(&path);
    fs::create_dir_all(&root).map_err(|e| format!("Cannot create vault dir: {e}"))?;
    let vault_dir = root.join(".vault");
    fs::create_dir_all(&vault_dir).map_err(|e| format!("Cannot create .vault dir: {e}"))?;

    let now = now_iso8601();
    let meta = serde_json::json!({ "name": name, "created": now });
    fs::write(
        vault_dir.join("meta.json"),
        serde_json::to_string_pretty(&meta).map_err(|e| e.to_string())?,
    )
    .map_err(|e| format!("Cannot write meta.json: {e}"))?;

    let entry = VaultEntry {
        id: ulid::Ulid::new().to_string(),
        name,
        path,
        last_opened: now.clone(),
        color,
    };

    let reg_path = registry_path(
        app_handle.path().app_data_dir().map_err(|e| e.to_string())?,
    );
    let mut reg = registry::load(&reg_path).map_err(|e| e.to_string())?;
    reg.last_active_vault = Some(entry.id.clone());
    reg.vaults.push(entry.clone());
    registry::save(&reg_path, &reg).map_err(|e| e.to_string())?;

    Ok(entry)
}

#[tauri::command]
pub async fn register_vault(
    path: String,
    app_handle: tauri::AppHandle,
) -> Result<VaultEntry, String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {path}"));
    }

    let vault_dir = root.join(".vault");
    fs::create_dir_all(&vault_dir).map_err(|e| format!("Cannot create .vault dir: {e}"))?;

    let meta_path = vault_dir.join("meta.json");
    if !meta_path.exists() {
        let now = now_iso8601();
        let name = root
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "Vault".to_string());
        let meta = serde_json::json!({ "name": name, "created": now });
        fs::write(
            &meta_path,
            serde_json::to_string_pretty(&meta).map_err(|e| e.to_string())?,
        )
        .map_err(|e| format!("Cannot write meta.json: {e}"))?;
    }

    let reg_path = registry_path(
        app_handle.path().app_data_dir().map_err(|e| e.to_string())?,
    );
    let mut reg = registry::load(&reg_path).map_err(|e| e.to_string())?;

    // Idempotent: if already registered just update last_opened.
    let now = now_iso8601();
    if let Some(entry) = reg.vaults.iter_mut().find(|e| e.path == path) {
        entry.last_opened = now;
        reg.last_active_vault = Some(entry.id.clone());
        let entry = entry.clone();
        registry::save(&reg_path, &reg).map_err(|e| e.to_string())?;
        return Ok(entry);
    }

    let name = root
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| "Vault".to_string());

    let entry = VaultEntry {
        id: ulid::Ulid::new().to_string(),
        name,
        path,
        last_opened: now,
        color: default_color(reg.vaults.len()),
    };

    reg.last_active_vault = Some(entry.id.clone());
    reg.vaults.push(entry.clone());
    registry::save(&reg_path, &reg).map_err(|e| e.to_string())?;

    Ok(entry)
}

#[tauri::command]
pub async fn rename_vault(
    id: String,
    name: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let reg_path = registry_path(
        app_handle.path().app_data_dir().map_err(|e| e.to_string())?,
    );
    let mut reg = registry::load(&reg_path).map_err(|e| e.to_string())?;
    let entry = reg.vaults.iter_mut().find(|e| e.id == id)
        .ok_or_else(|| format!("Vault not found: {id}"))?;
    entry.name = name;
    registry::save(&reg_path, &reg).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn remove_vault(
    id: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let reg_path = registry_path(
        app_handle.path().app_data_dir().map_err(|e| e.to_string())?,
    );
    let mut reg = registry::load(&reg_path).map_err(|e| e.to_string())?;
    reg.vaults.retain(|e| e.id != id);
    if reg.last_active_vault.as_deref() == Some(&id) {
        reg.last_active_vault = None;
    }
    registry::save(&reg_path, &reg).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn close_vault(state: tauri::State<'_, AppState>) -> Result<(), String> {
    *state.vault.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub async fn reveal_vault(path: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app_handle
        .opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pick_folder(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use tokio::sync::oneshot;

    let (tx, rx) = oneshot::channel();
    app_handle.dialog().file().pick_folder(move |folder| {
        let _ = tx.send(folder);
    });
    let folder = rx.await.map_err(|e| e.to_string())?;
    Ok(folder.map(|f| f.to_string()))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn default_color(index: usize) -> String {
    const COLORS: &[&str] = &[
        "#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4",
    ];
    COLORS[index % COLORS.len()].to_string()
}

fn start_watcher(
    vault_root: PathBuf,
    pool: sqlx::SqlitePool,
    app_handle: tauri::AppHandle,
) -> notify::Result<RecommendedWatcher> {
    let (tx, mut rx) = unbounded_channel::<notify::Result<notify::Event>>();

    let mut watcher = notify::recommended_watcher(move |res| {
        let _ = tx.send(res);
    })?;
    watcher.watch(&vault_root, RecursiveMode::Recursive)?;

    let root = vault_root.clone();
    tokio::spawn(async move {
        while let Some(Ok(event)) = rx.recv().await {
            for path in &event.paths {
                if path.extension().and_then(|e| e.to_str()) != Some("md") {
                    continue;
                }
                if path.to_string_lossy().contains("/.vault/") {
                    continue;
                }
                use notify::EventKind::*;
                match event.kind {
                    Remove(_) => {
                        let _ = indexer::remove_file(&pool, path, &root).await;
                    }
                    _ => {
                        let _ = indexer::index_file(&pool, path, &root).await;
                    }
                }
            }
            let _ = app_handle.emit("vault:index-updated", ());
        }
    });

    Ok(watcher)
}
