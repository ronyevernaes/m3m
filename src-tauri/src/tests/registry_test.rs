use tempfile::TempDir;
use crate::registry::{self, Registry, VaultEntry};

fn make_entry(id: &str, name: &str, path: &str) -> VaultEntry {
    VaultEntry {
        id: id.to_string(),
        name: name.to_string(),
        path: path.to_string(),
        last_opened: "2025-01-01T00:00:00Z".to_string(),
        color: "#a855f7".to_string(),
    }
}

#[test]
fn load_missing_returns_empty() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("nonexistent.json");
    let reg = registry::load(&path).unwrap();
    assert!(reg.vaults.is_empty());
    assert!(reg.last_active_vault.is_none());
}

#[test]
fn save_and_reload_roundtrip() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("registry.json");

    let entry = make_entry("01ABCDEF", "Work", "/home/user/Work");
    let reg = Registry {
        vaults: vec![entry.clone()],
        last_active_vault: Some("01ABCDEF".to_string()),
    };
    registry::save(&path, &reg).unwrap();

    let loaded = registry::load(&path).unwrap();
    assert_eq!(loaded.vaults.len(), 1);
    assert_eq!(loaded.vaults[0].id, "01ABCDEF");
    assert_eq!(loaded.vaults[0].name, "Work");
    assert_eq!(loaded.vaults[0].path, "/home/user/Work");
    assert_eq!(loaded.last_active_vault, Some("01ABCDEF".to_string()));
}

#[test]
fn add_second_vault_appends() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("registry.json");

    let mut reg = Registry::default();
    reg.vaults.push(make_entry("AAA", "Work", "/work"));
    reg.vaults.push(make_entry("BBB", "Personal", "/personal"));
    registry::save(&path, &reg).unwrap();

    let loaded = registry::load(&path).unwrap();
    assert_eq!(loaded.vaults.len(), 2);
}

#[test]
fn remove_vault_by_id() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("registry.json");

    let mut reg = Registry::default();
    reg.vaults.push(make_entry("AAA", "Work", "/work"));
    reg.vaults.push(make_entry("BBB", "Personal", "/personal"));
    registry::save(&path, &reg).unwrap();

    let mut loaded = registry::load(&path).unwrap();
    loaded.vaults.retain(|e| e.id != "AAA");
    registry::save(&path, &loaded).unwrap();

    let final_reg = registry::load(&path).unwrap();
    assert_eq!(final_reg.vaults.len(), 1);
    assert_eq!(final_reg.vaults[0].id, "BBB");
}

#[test]
fn rename_only_changes_name() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("registry.json");

    let mut reg = Registry::default();
    reg.vaults.push(make_entry("AAA", "OldName", "/work"));
    registry::save(&path, &reg).unwrap();

    let mut loaded = registry::load(&path).unwrap();
    loaded.vaults.iter_mut().find(|e| e.id == "AAA").unwrap().name = "NewName".to_string();
    registry::save(&path, &loaded).unwrap();

    let final_reg = registry::load(&path).unwrap();
    let entry = &final_reg.vaults[0];
    assert_eq!(entry.name, "NewName");
    assert_eq!(entry.path, "/work");
    assert_eq!(entry.id, "AAA");
}

#[test]
fn last_active_cleared_on_remove() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("registry.json");

    let mut reg = Registry { vaults: vec![], last_active_vault: Some("AAA".to_string()) };
    reg.vaults.push(make_entry("AAA", "Work", "/work"));
    registry::save(&path, &reg).unwrap();

    let mut loaded = registry::load(&path).unwrap();
    loaded.vaults.retain(|e| e.id != "AAA");
    if loaded.last_active_vault.as_deref() == Some("AAA") {
        loaded.last_active_vault = None;
    }
    registry::save(&path, &loaded).unwrap();

    let final_reg = registry::load(&path).unwrap();
    assert!(final_reg.vaults.is_empty());
    assert!(final_reg.last_active_vault.is_none());
}
