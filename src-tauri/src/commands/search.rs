use crate::{AppState, indexer};
use crate::models::note::SearchResult;

#[tauri::command]
pub async fn search_notes(
    query: String,
    limit: Option<u32>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<SearchResult>, String> {
    let (pool, vault_root) = {
        let guard = state.vault.lock().unwrap();
        match guard.as_ref() {
            Some(ctx) => (ctx.db.clone(), ctx.vault_root.clone()),
            None => return Ok(Vec::new()),
        }
    };
    let mut results = indexer::search(&pool, &query, limit.unwrap_or(20))
        .await
        .map_err(|e| e.to_string())?;
    for r in &mut results {
        r.path = vault_root.join(&r.path).to_string_lossy().to_string();
    }
    Ok(results)
}
