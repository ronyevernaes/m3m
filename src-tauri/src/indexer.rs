use std::fs;
use std::path::{Path, PathBuf};

use anyhow::Context;
use sha2::{Digest, Sha256};
use sqlx::{SqlitePool, sqlite::SqliteConnectOptions};

use crate::frontmatter;
use crate::models::note::SearchResult;

// ---------------------------------------------------------------------------
// Database bootstrap
// ---------------------------------------------------------------------------

pub async fn open_db(vault_root: &Path) -> anyhow::Result<SqlitePool> {
    let vault_dir = vault_root.join(".vault");
    fs::create_dir_all(&vault_dir)
        .with_context(|| format!("create .vault dir at {}", vault_dir.display()))?;

    let db_path = vault_dir.join("index.db");
    let opts = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true);

    let pool = SqlitePool::connect_with(opts).await?;
    bootstrap_schema(&pool).await?;
    Ok(pool)
}

async fn bootstrap_schema(pool: &SqlitePool) -> anyhow::Result<()> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS notes (
            id         TEXT NOT NULL DEFAULT '',
            path       TEXT NOT NULL UNIQUE,
            title      TEXT NOT NULL DEFAULT '',
            created    TEXT NOT NULL DEFAULT '',
            modified   TEXT NOT NULL DEFAULT '',
            tags       TEXT NOT NULL DEFAULT '[]',
            body       TEXT NOT NULL DEFAULT '',
            body_hash  TEXT NOT NULL DEFAULT '',
            indexed_at TEXT NOT NULL DEFAULT ''
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
            title,
            body,
            tags,
            content='notes',
            content_rowid='rowid'
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
            INSERT INTO notes_fts(rowid, title, body, tags)
            VALUES (new.rowid, new.title, new.body, new.tags);
        END",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
            INSERT INTO notes_fts(notes_fts, rowid, title, body, tags)
            VALUES ('delete', old.rowid, old.title, old.body, old.tags);
        END",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
            INSERT INTO notes_fts(notes_fts, rowid, title, body, tags)
            VALUES ('delete', old.rowid, old.title, old.body, old.tags);
            INSERT INTO notes_fts(rowid, title, body, tags)
            VALUES (new.rowid, new.title, new.body, new.tags);
        END",
    )
    .execute(pool)
    .await?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Indexing
// ---------------------------------------------------------------------------

/// Walk vault recursively and upsert every .md file. Returns count processed.
pub async fn index_vault(pool: &SqlitePool, vault_root: &Path) -> anyhow::Result<usize> {
    let files = walk_md_files(vault_root);
    let count = files.len();
    for path in files {
        index_file(pool, &path, vault_root).await?;
    }
    Ok(count)
}

/// Index a single file. Skips upsert if body_hash matches (idempotent).
/// If the file no longer exists, removes it from the index.
pub async fn index_file(pool: &SqlitePool, path: &Path, vault_root: &Path) -> anyhow::Result<()> {
    if !path.exists() {
        return remove_file(pool, path, vault_root).await;
    }

    let content = fs::read_to_string(path)
        .with_context(|| format!("read {}", path.display()))?;
    let new_hash = hash_content(&content);

    let rel = path_to_relative(path, vault_root);

    // Skip upsert if nothing changed
    let existing: Option<String> = sqlx::query_scalar(
        "SELECT body_hash FROM notes WHERE path = ?1",
    )
    .bind(&rel)
    .fetch_optional(pool)
    .await?;

    if existing.as_deref() == Some(&new_hash) {
        return Ok(());
    }

    let parsed = frontmatter::parse(&content);
    let fm = parsed.frontmatter;
    let title = if fm.title.is_empty() {
        frontmatter::title_from_path(&rel)
    } else {
        fm.title
    };
    let tags_json = serde_json::to_string(&fm.tags).unwrap_or_else(|_| "[]".into());
    let now = chrono_now();

    sqlx::query(
        "INSERT INTO notes (id, path, title, created, modified, tags, body, body_hash, indexed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(path) DO UPDATE SET
            id         = excluded.id,
            title      = excluded.title,
            created    = excluded.created,
            modified   = excluded.modified,
            tags       = excluded.tags,
            body       = excluded.body,
            body_hash  = excluded.body_hash,
            indexed_at = excluded.indexed_at",
    )
    .bind(&fm.id)
    .bind(&rel)
    .bind(&title)
    .bind(&fm.created)
    .bind(&fm.modified)
    .bind(&tags_json)
    .bind(&parsed.body)
    .bind(&new_hash)
    .bind(&now)
    .execute(pool)
    .await?;

    Ok(())
}

/// Remove a note from the index by path.
pub async fn remove_file(pool: &SqlitePool, path: &Path, vault_root: &Path) -> anyhow::Result<()> {
    let rel = path_to_relative(path, vault_root);
    sqlx::query("DELETE FROM notes WHERE path = ?1")
        .bind(&rel)
        .execute(pool)
        .await?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

pub async fn search(pool: &SqlitePool, query: &str, limit: u32) -> anyhow::Result<Vec<SearchResult>> {
    let rows = sqlx::query_as::<_, SearchRow>(
        "SELECT n.id, n.path, n.title, n.tags,
                snippet(notes_fts, 1, '<mark>', '</mark>', '…', 20) AS snippet
         FROM notes_fts
         JOIN notes n ON notes_fts.rowid = n.rowid
         WHERE notes_fts MATCH ?1
         ORDER BY notes_fts.rank
         LIMIT ?2",
    )
    .bind(query)
    .bind(limit as i64)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| {
            let tags: Vec<String> =
                serde_json::from_str(&r.tags).unwrap_or_default();
            SearchResult {
                id: r.id,
                path: r.path,
                title: r.title,
                snippet: r.snippet,
                tags,
            }
        })
        .collect())
}

#[derive(sqlx::FromRow)]
struct SearchRow {
    id: String,
    path: String,
    title: String,
    tags: String,
    snippet: String,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Recursively collect all .md files under dir, skipping .vault/.
pub fn walk_md_files(dir: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    let Ok(entries) = fs::read_dir(dir) else { return out };
    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_dir() {
            if p.file_name().map(|n| n == ".vault").unwrap_or(false) {
                continue;
            }
            out.extend(walk_md_files(&p));
        } else if p.extension().and_then(|e| e.to_str()) == Some("md") {
            out.push(p);
        }
    }
    out
}

pub fn hash_content(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn path_to_relative(path: &Path, vault_root: &Path) -> String {
    path.strip_prefix(vault_root)
        .unwrap_or(path)
        .to_string_lossy()
        .to_string()
}

fn chrono_now() -> String {
    // ISO8601 without pulling in chrono — use std::time
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // Simple ISO8601 UTC: good enough for cache metadata
    let s = secs;
    let (y, mo, d, h, mi, sec) = epoch_to_ymd_hms(s);
    format!("{y:04}-{mo:02}-{d:02}T{h:02}:{mi:02}:{sec:02}Z")
}

fn epoch_to_ymd_hms(epoch: u64) -> (u64, u64, u64, u64, u64, u64) {
    let sec = epoch % 60;
    let min = (epoch / 60) % 60;
    let hour = (epoch / 3600) % 24;
    let days = epoch / 86400;
    // Days since 1970-01-01
    let (y, mo, d) = days_to_ymd(days);
    (y, mo, d, hour, min, sec)
}

fn days_to_ymd(mut days: u64) -> (u64, u64, u64) {
    let mut year = 1970u64;
    loop {
        let days_in_year = if is_leap(year) { 366 } else { 365 };
        if days < days_in_year {
            break;
        }
        days -= days_in_year;
        year += 1;
    }
    let month_days: &[u64] = if is_leap(year) {
        &[31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        &[31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let mut month = 1u64;
    for &md in month_days {
        if days < md {
            break;
        }
        days -= md;
        month += 1;
    }
    (year, month, days + 1)
}

fn is_leap(y: u64) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}
