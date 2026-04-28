use std::path::Path;

pub struct Frontmatter {
    pub id: String,
    pub title: String,
    pub created: String,
    pub modified: String,
    pub tags: Vec<String>,
    pub links: Vec<String>,
}

pub struct ParsedMd {
    pub frontmatter: Frontmatter,
    pub body: String,
}

/// Parse YAML frontmatter + body from raw .md content.
/// Never panics. Unknown keys are silently ignored (never removed from source).
pub fn parse(content: &str) -> ParsedMd {
    let mut in_fm = false;
    let mut fm_done = false;
    let mut id = String::new();
    let mut title = String::new();
    let mut created = String::new();
    let mut modified = String::new();
    let mut tags: Vec<String> = Vec::new();
    let mut links: Vec<String> = Vec::new();
    let mut fm_end_byte = 0usize;

    // Track multi-line list state
    let mut parsing_tags = false;
    let mut parsing_links = false;

    let mut byte_pos = 0usize;

    for (i, line) in content.lines().enumerate() {
        let line_len = line.len() + 1; // +1 for '\n'

        if i == 0 {
            if line == "---" {
                in_fm = true;
                byte_pos += line_len;
                continue;
            } else {
                // No frontmatter
                break;
            }
        }

        if in_fm && !fm_done {
            if line == "---" {
                fm_done = true;
                fm_end_byte = byte_pos + line_len;
                byte_pos += line_len;
                continue;
            }

            // Multi-line list continuation
            if parsing_tags {
                if let Some(item) = line.trim().strip_prefix("- ") {
                    tags.push(item.trim().to_string());
                    byte_pos += line_len;
                    continue;
                } else {
                    parsing_tags = false;
                }
            }
            if parsing_links {
                if let Some(item) = line.trim().strip_prefix("- ") {
                    links.push(item.trim().to_string());
                    byte_pos += line_len;
                    continue;
                } else {
                    parsing_links = false;
                }
            }

            if let Some(v) = line.strip_prefix("id: ") {
                id = v.trim().to_string();
            } else if let Some(v) = line.strip_prefix("title: ") {
                title = v.trim().to_string();
            } else if let Some(v) = line.strip_prefix("created: ") {
                created = v.trim().to_string();
            } else if let Some(v) = line.strip_prefix("modified: ") {
                modified = v.trim().to_string();
            } else if line == "tags:" || line.starts_with("tags: ") {
                let v = line.trim_start_matches("tags:").trim();
                if v.is_empty() {
                    parsing_tags = true;
                } else {
                    tags = parse_inline_list(v);
                }
            } else if line == "links:" || line.starts_with("links: ") {
                let v = line.trim_start_matches("links:").trim();
                if v.is_empty() {
                    parsing_links = true;
                } else {
                    links = parse_inline_list(v);
                }
            }
        }

        byte_pos += line_len;
    }

    let body = if fm_done {
        content[fm_end_byte..].trim_start_matches('\n').to_string()
    } else {
        content.to_string()
    };

    ParsedMd {
        frontmatter: Frontmatter { id, title, created, modified, tags, links },
        body,
    }
}

/// Parse `[a, b, c]` or `a, b, c` into a Vec<String>.
fn parse_inline_list(s: &str) -> Vec<String> {
    let s = s.trim().trim_start_matches('[').trim_end_matches(']');
    if s.is_empty() {
        return Vec::new();
    }
    s.split(',').map(|t| t.trim().to_string()).filter(|t| !t.is_empty()).collect()
}

/// Build a fallback title from a file path's stem.
pub fn title_from_path(path: &str) -> String {
    Path::new(path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}
