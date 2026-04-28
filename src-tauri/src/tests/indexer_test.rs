use std::fs;
use sqlx::SqlitePool;
use tempfile::TempDir;
use crate::indexer;

async fn pool_with_schema() -> (SqlitePool, TempDir) {
    let dir = TempDir::new().unwrap();
    let pool = indexer::open_db(dir.path()).await.unwrap();
    (pool, dir)
}

fn write_note(dir: &TempDir, name: &str, content: &str) -> std::path::PathBuf {
    let path = dir.path().join(name);
    fs::write(&path, content).unwrap();
    path
}

#[tokio::test]
async fn bootstrap_schema_is_idempotent() {
    let dir = TempDir::new().unwrap();
    // Call open_db twice — second call must not error
    let pool = indexer::open_db(dir.path()).await.unwrap();
    drop(pool);
    indexer::open_db(dir.path()).await.unwrap();
}

#[tokio::test]
async fn index_file_inserts_row() {
    let (pool, dir) = pool_with_schema().await;
    let path = write_note(&dir, "note.md", "---\nid: abc\ntitle: Test\n---\n\nHello world.");
    indexer::index_file(&pool, &path, dir.path()).await.unwrap();

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM notes")
        .fetch_one(&pool).await.unwrap();
    assert_eq!(count, 1);
}

#[tokio::test]
async fn index_file_same_content_no_update() {
    let (pool, dir) = pool_with_schema().await;
    let content = "---\nid: abc\ntitle: Test\n---\n\nHello.";
    let path = write_note(&dir, "note.md", content);
    indexer::index_file(&pool, &path, dir.path()).await.unwrap();

    let hash1: String = sqlx::query_scalar("SELECT body_hash FROM notes WHERE path = 'note.md'")
        .fetch_one(&pool).await.unwrap();

    // Re-index same content
    indexer::index_file(&pool, &path, dir.path()).await.unwrap();
    let hash2: String = sqlx::query_scalar("SELECT body_hash FROM notes WHERE path = 'note.md'")
        .fetch_one(&pool).await.unwrap();

    assert_eq!(hash1, hash2);
}

#[tokio::test]
async fn index_file_changed_content_updates_row() {
    let (pool, dir) = pool_with_schema().await;
    let path = write_note(&dir, "note.md", "---\nid: abc\ntitle: Old\n---\n\nOld body.");
    indexer::index_file(&pool, &path, dir.path()).await.unwrap();

    fs::write(&path, "---\nid: abc\ntitle: New\n---\n\nNew body.").unwrap();
    indexer::index_file(&pool, &path, dir.path()).await.unwrap();

    let title: String = sqlx::query_scalar("SELECT title FROM notes WHERE path = 'note.md'")
        .fetch_one(&pool).await.unwrap();
    assert_eq!(title, "New");
}

#[tokio::test]
async fn remove_file_deletes_row() {
    let (pool, dir) = pool_with_schema().await;
    let path = write_note(&dir, "note.md", "---\nid: abc\ntitle: Test\n---\n");
    indexer::index_file(&pool, &path, dir.path()).await.unwrap();
    indexer::remove_file(&pool, &path, dir.path()).await.unwrap();

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM notes")
        .fetch_one(&pool).await.unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
async fn search_empty_vault_returns_empty() {
    let (pool, _dir) = pool_with_schema().await;
    let results = indexer::search(&pool, "anything", 10).await.unwrap();
    assert!(results.is_empty());
}

#[tokio::test]
async fn search_finds_note_by_body_keyword() {
    let (pool, dir) = pool_with_schema().await;
    write_note(&dir, "rust.md", "---\nid: r1\ntitle: Rust Notes\n---\n\nOwnership and borrowing.");
    indexer::index_vault(&pool, dir.path()).await.unwrap();

    let results = indexer::search(&pool, "borrowing", 10).await.unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].title, "Rust Notes");
}

#[tokio::test]
async fn search_finds_note_by_title() {
    let (pool, dir) = pool_with_schema().await;
    write_note(&dir, "tauri.md", "---\nid: t1\ntitle: Tauri Guide\n---\n\nBuild desktop apps.");
    indexer::index_vault(&pool, dir.path()).await.unwrap();

    let results = indexer::search(&pool, "Tauri", 10).await.unwrap();
    assert_eq!(results.len(), 1);
}

#[tokio::test]
async fn index_vault_counts_md_files() {
    let (pool, dir) = pool_with_schema().await;
    write_note(&dir, "a.md", "---\nid: a\ntitle: A\n---\n");
    write_note(&dir, "b.md", "---\nid: b\ntitle: B\n---\n");
    write_note(&dir, "c.md", "---\nid: c\ntitle: C\n---\n");

    let count = indexer::index_vault(&pool, dir.path()).await.unwrap();
    assert_eq!(count, 3);
}

#[tokio::test]
async fn index_vault_second_run_returns_same_count() {
    let (pool, dir) = pool_with_schema().await;
    write_note(&dir, "a.md", "---\nid: a\ntitle: A\n---\n");
    indexer::index_vault(&pool, dir.path()).await.unwrap();

    // Re-run: files unchanged, all hashes match, still processes same count
    let count = indexer::index_vault(&pool, dir.path()).await.unwrap();
    assert_eq!(count, 1);
}

#[tokio::test]
async fn index_vault_skips_vault_directory() {
    let (pool, dir) = pool_with_schema().await;
    write_note(&dir, "real.md", "---\nid: r\ntitle: Real\n---\n");
    // open_db already created .vault/; write a fake .md inside it
    fs::write(dir.path().join(".vault").join("fake.md"), "should be skipped").unwrap();

    let count = indexer::index_vault(&pool, dir.path()).await.unwrap();
    assert_eq!(count, 1);
}

// ---------------------------------------------------------------------------
// Backlink tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn backlinks_stored_when_note_links_another() {
    let (pool, dir) = pool_with_schema().await;
    write_note(&dir, "b.md", "---\nid: id-b\ntitle: Note B\n---\n");
    write_note(&dir, "a.md", "---\nid: id-a\ntitle: Note A\nlinks: [id-b]\n---\n");
    indexer::index_vault(&pool, dir.path()).await.unwrap();

    let backlinks = indexer::get_backlinks(&pool, "id-b").await.unwrap();
    assert_eq!(backlinks.len(), 1);
    assert_eq!(backlinks[0].id, "id-a");
    assert_eq!(backlinks[0].title, "Note A");
}

#[tokio::test]
async fn backlinks_not_stored_when_source_has_no_id() {
    let (pool, dir) = pool_with_schema().await;
    write_note(&dir, "anon.md", "---\nlinks: [id-target]\n---\n");
    indexer::index_vault(&pool, dir.path()).await.unwrap();

    let backlinks = indexer::get_backlinks(&pool, "id-target").await.unwrap();
    assert!(backlinks.is_empty());
}

#[tokio::test]
async fn stale_links_removed_on_reindex() {
    let (pool, dir) = pool_with_schema().await;
    let path = write_note(&dir, "a.md", "---\nid: id-a\ntitle: A\nlinks: [id-b]\n---\n");
    indexer::index_file(&pool, &path, dir.path()).await.unwrap();

    fs::write(&path, "---\nid: id-a\ntitle: A\n---\n").unwrap();
    indexer::index_file(&pool, &path, dir.path()).await.unwrap();

    let backlinks = indexer::get_backlinks(&pool, "id-b").await.unwrap();
    assert!(backlinks.is_empty());
}

#[tokio::test]
async fn multiple_sources_link_to_same_target() {
    let (pool, dir) = pool_with_schema().await;
    write_note(&dir, "a.md", "---\nid: id-a\ntitle: A\nlinks: [id-c]\n---\n");
    write_note(&dir, "b.md", "---\nid: id-b\ntitle: B\nlinks: [id-c]\n---\n");
    write_note(&dir, "c.md", "---\nid: id-c\ntitle: C\n---\n");
    indexer::index_vault(&pool, dir.path()).await.unwrap();

    let backlinks = indexer::get_backlinks(&pool, "id-c").await.unwrap();
    assert_eq!(backlinks.len(), 2);
}

#[tokio::test]
async fn forward_reference_stored_without_error() {
    let (pool, dir) = pool_with_schema().await;
    let path = write_note(&dir, "a.md", "---\nid: id-a\ntitle: A\nlinks: [id-future]\n---\n");
    indexer::index_file(&pool, &path, dir.path()).await.unwrap();

    // Forward reference is stored: id-a already appears as a backlink of id-future
    // even though id-future is not yet a note in the vault.
    let backlinks = indexer::get_backlinks(&pool, "id-future").await.unwrap();
    assert_eq!(backlinks.len(), 1);
    assert_eq!(backlinks[0].id, "id-a");
}

#[tokio::test]
async fn remove_file_cleans_outbound_links() {
    let (pool, dir) = pool_with_schema().await;
    let path = write_note(&dir, "a.md", "---\nid: id-a\ntitle: A\nlinks: [id-b]\n---\n");
    indexer::index_file(&pool, &path, dir.path()).await.unwrap();
    indexer::remove_file(&pool, &path, dir.path()).await.unwrap();

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM note_links")
        .fetch_one(&pool).await.unwrap();
    assert_eq!(count, 0);
}
