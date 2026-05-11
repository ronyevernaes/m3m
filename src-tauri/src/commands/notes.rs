use std::fs;
use std::path::{Path, PathBuf};
use tauri::command;
use crate::frontmatter;
use crate::models::note::{NoteListItem, RawNote};

#[command]
pub async fn list_notes(vault_path: String) -> Result<Vec<NoteListItem>, String> {
    let path = Path::new(&vault_path);
    let mut notes = Vec::new();

    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let file_path = entry.path();
        if file_path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        // Skip anything inside .vault/
        if file_path
            .to_string_lossy()
            .contains("/.vault/")
        {
            continue;
        }
        let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
        let path_str = file_path.to_string_lossy().to_string();
        let parsed = frontmatter::parse(&content);
        let title = if parsed.frontmatter.title.is_empty() {
            frontmatter::title_from_path(&path_str)
        } else {
            parsed.frontmatter.title
        };
        notes.push(NoteListItem {
            id: parsed.frontmatter.id,
            title,
            path: path_str,
            modified: parsed.frontmatter.modified,
            tags: parsed.frontmatter.tags,
        });
    }

    notes.sort_by(|a, b| b.modified.cmp(&a.modified));
    Ok(notes)
}

#[command]
pub async fn read_note(path: String) -> Result<RawNote, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(RawNote { path, content })
}

#[command]
pub async fn write_note(path: String, content: String) -> Result<String, String> {
    let file_path = Path::new(&path);
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, &content).map_err(|e| e.to_string())?;
    Ok(path)
}

#[command]
pub async fn create_note(vault_path: String, title: String) -> Result<RawNote, String> {
    let slug = slugify(&title);
    let base_path = Path::new(&vault_path).join(format!("{slug}.md"));
    let file_path = resolve_unique_path(base_path);

    fs::create_dir_all(Path::new(&vault_path)).map_err(|e| e.to_string())?;
    fs::write(&file_path, "").map_err(|e| e.to_string())?;

    Ok(RawNote {
        path: file_path.to_string_lossy().to_string(),
        content: String::new(),
    })
}


fn slugify(title: &str) -> String {
    let slug: String = title
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect();
    slug.split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

#[command]
pub async fn rename_note(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

#[command]
pub async fn delete_note(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}

fn resolve_unique_path(path: PathBuf) -> PathBuf {
    if !path.exists() {
        return path;
    }
    let stem = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
    let ext = path.extension().unwrap_or_default().to_string_lossy().to_string();
    let parent = path.parent().unwrap();
    let mut counter = 1u32;
    loop {
        let candidate = parent.join(format!("{stem}-{counter}.{ext}"));
        if !candidate.exists() {
            return candidate;
        }
        counter += 1;
    }
}

