use std::fs;
use tempfile::TempDir;

fn write_note(dir: &TempDir, name: &str) -> std::path::PathBuf {
    let path = dir.path().join(name);
    fs::write(&path, "---\nid: abc\ntitle: Test\n---\n").unwrap();
    path
}

#[test]
fn delete_note_removes_file() {
    let dir = TempDir::new().unwrap();
    let path = write_note(&dir, "note.md");
    assert!(path.exists());

    fs::remove_file(&path).unwrap();
    assert!(!path.exists());
}
