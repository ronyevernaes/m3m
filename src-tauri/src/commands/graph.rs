use crate::{AppState, indexer};
use crate::models::note::BacklinkItem;

#[tauri::command]
pub async fn get_backlinks(
    note_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<BacklinkItem>, String> {
    let (pool, vault_root) = {
        let guard = state.vault.lock().unwrap();
        match guard.as_ref() {
            Some(ctx) => (ctx.db.clone(), ctx.vault_root.clone()),
            None => return Ok(Vec::new()),
        }
    };
    let mut results = indexer::get_backlinks(&pool, &note_id)
        .await
        .map_err(|e| e.to_string())?;
    for r in &mut results {
        r.path = vault_root.join(&r.path).to_string_lossy().to_string();
    }
    Ok(results)
}
