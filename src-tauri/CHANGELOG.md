# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0](https://github.com/ronyevernaes/m3m/releases/tag/v0.1.0) - 2026-05-14

### Added

- release & versioning infrastructure
- *(P0)* auto-save notes on edit, note switch, and app close
- *(P0)* delete a note — permanent deletion with confirmation dialog
- *(P0)* Vault Manager — multi-vault registry, switcher, and welcome screen
- *(P0)* rename file on title change using slug + ULID suffix
- *(P0)* backlink panel
- *(P0)* vault watcher + SQLite FTS5 index
- implement P0 core editor — Tauri IPC, TipTap, Zustand, markdown pipeline

### Fixed

- fix error on search notes

### Other

- update `Cargo.toml`
- change app icon
- initial scaffold — m3m (Tauri + React/TS + Bun + Vitest)
