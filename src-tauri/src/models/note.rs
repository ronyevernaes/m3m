use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteListItem {
    pub id: String,
    pub title: String,
    pub path: String,
    pub modified: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawNote {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub path: String,
    pub title: String,
    pub snippet: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BacklinkItem {
    pub id: String,
    pub path: String,
    pub title: String,
    pub modified: String,
}
