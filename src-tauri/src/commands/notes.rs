use std::fs;
use std::path::{Path, PathBuf};
use tauri::command;
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
        let item = extract_list_item(&content, file_path.to_string_lossy().to_string());
        notes.push(item);
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

fn extract_list_item(content: &str, path: String) -> NoteListItem {
    let mut in_fm = false;
    let mut id = String::new();
    let mut title = String::new();
    let mut modified = String::new();
    let mut tags: Vec<String> = Vec::new();

    for (i, line) in content.lines().enumerate() {
        if i == 0 && line == "---" {
            in_fm = true;
            continue;
        }
        if in_fm && line == "---" {
            break;
        }
        if !in_fm {
            break;
        }

        if let Some(v) = line.strip_prefix("id: ") {
            id = v.trim().to_string();
        } else if let Some(v) = line.strip_prefix("title: ") {
            title = v.trim().to_string();
        } else if let Some(v) = line.strip_prefix("modified: ") {
            modified = v.trim().to_string();
        } else if let Some(v) = line.strip_prefix("tags: ") {
            tags = parse_inline_yaml_list(v);
        }
    }

    // Fall back to filename as title if frontmatter has none.
    if title.is_empty() {
        title = Path::new(&path)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
    }

    NoteListItem { id, title, path, modified, tags }
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

fn parse_inline_yaml_list(s: &str) -> Vec<String> {
    let s = s.trim().trim_start_matches('[').trim_end_matches(']');
    if s.is_empty() {
        return Vec::new();
    }
    s.split(',').map(|t| t.trim().to_string()).collect()
}
