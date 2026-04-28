use crate::frontmatter;

#[test]
fn full_frontmatter_all_fields() {
    let content = "---\nid: 01ABCDEF\ntitle: My Note\ncreated: 2024-01-01T00:00:00Z\nmodified: 2024-06-01T00:00:00Z\ntags: [rust, tauri]\nlinks: [01LINK01]\n---\n\nBody text here.";
    let parsed = frontmatter::parse(content);
    assert_eq!(parsed.frontmatter.id, "01ABCDEF");
    assert_eq!(parsed.frontmatter.title, "My Note");
    assert_eq!(parsed.frontmatter.created, "2024-01-01T00:00:00Z");
    assert_eq!(parsed.frontmatter.modified, "2024-06-01T00:00:00Z");
    assert_eq!(parsed.frontmatter.tags, vec!["rust", "tauri"]);
    assert_eq!(parsed.frontmatter.links, vec!["01LINK01"]);
    assert_eq!(parsed.body, "Body text here.");
}

#[test]
fn no_frontmatter_returns_full_content_as_body() {
    let content = "Just a plain markdown file.\n\nNo frontmatter here.";
    let parsed = frontmatter::parse(content);
    assert!(parsed.frontmatter.id.is_empty());
    assert!(parsed.frontmatter.title.is_empty());
    assert_eq!(parsed.body, content);
}

#[test]
fn inline_tags_parsed_correctly() {
    let content = "---\ntags: [alpha, beta, gamma]\n---\n";
    let parsed = frontmatter::parse(content);
    assert_eq!(parsed.frontmatter.tags, vec!["alpha", "beta", "gamma"]);
}

#[test]
fn multiline_tags_parsed_correctly() {
    let content = "---\ntags:\n  - alpha\n  - beta\n  - gamma\n---\n";
    let parsed = frontmatter::parse(content);
    assert_eq!(parsed.frontmatter.tags, vec!["alpha", "beta", "gamma"]);
}

#[test]
fn missing_id_returns_empty_string_no_panic() {
    let content = "---\ntitle: No ID Note\n---\n";
    let parsed = frontmatter::parse(content);
    assert!(parsed.frontmatter.id.is_empty());
    assert_eq!(parsed.frontmatter.title, "No ID Note");
}

#[test]
fn only_delimiters_no_panic() {
    let content = "---\n---\n";
    let parsed = frontmatter::parse(content);
    assert!(parsed.frontmatter.id.is_empty());
    assert!(parsed.body.is_empty());
}

#[test]
fn unknown_keys_ignored_body_preserved() {
    let content = "---\nid: abc\ncustom_key: some value\ntitle: Hello\n---\n\nContent.";
    let parsed = frontmatter::parse(content);
    assert_eq!(parsed.frontmatter.id, "abc");
    assert_eq!(parsed.frontmatter.title, "Hello");
    assert_eq!(parsed.body, "Content.");
}

#[test]
fn empty_tags_list() {
    let content = "---\ntags: []\n---\n";
    let parsed = frontmatter::parse(content);
    assert!(parsed.frontmatter.tags.is_empty());
}
