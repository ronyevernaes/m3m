# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-05-19

### Added
- In-app notifications when a new version of m3m is available — no need to check manually
- Global settings for appearance (light/dark theme, font size) and vault behaviour
- Per-vault settings: customize autosave delay, line width, accent color, and display name for each vault independently
- Settings panel is now accessible directly from the editor toolbar

### Fixed
- Opening the app no longer shows a blank editor before a note is loaded
- Font size preference was not applying to the editor text area
- The "reopen last vault" option had no effect when returning to the app

---

## [0.1.0] — 2026-05-14

### Added
- Create, edit, and delete markdown notes stored entirely on your device — no account required
- Notes are saved automatically as you type, and when you switch notes or close the app
- Full-text search across all your notes with ⌘K — results update instantly
- Backlinks panel: see every note that references the one you're reading
- Tag sidebar: browse your notes filtered by tag with a single click
- Manage multiple independent knowledge bases (vaults) and switch between them from the sidebar
- Note filenames on disk update automatically when you change a note's title
- Built-in Markdown editor with support for headings, lists, task items, bold, italic, and more
