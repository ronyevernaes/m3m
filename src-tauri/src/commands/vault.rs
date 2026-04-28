use std::fs;
use std::path::PathBuf;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use tauri::Emitter;
use tokio::sync::mpsc::unbounded_channel;

use crate::{AppState, VaultContext, indexer};

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
    let watcher = start_watcher(root.clone(), pool.clone(), app_handle)
        .map_err(|e| e.to_string())?;

    let ctx = VaultContext { vault_root: root, db: pool, _watcher: watcher };
    *state.vault.lock().unwrap() = Some(ctx);

    Ok(count)
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
