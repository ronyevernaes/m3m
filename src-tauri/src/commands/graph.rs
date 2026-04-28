use crate::{AppState, indexer};
use crate::models::note::BacklinkItem;

#[tauri::command]
pub async fn get_backlinks(
    note_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<BacklinkItem>, String> {
    let pool = {
        let guard = state.vault.lock().unwrap();
        match guard.as_ref() {
            Some(ctx) => ctx.db.clone(),
            None => return Ok(Vec::new()),
        }
    };
    indexer::get_backlinks(&pool, &note_id)
        .await
        .map_err(|e| e.to_string())
}
