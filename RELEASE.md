# Release

## One-time setup

### 1. Generate the Tauri signing keypair

```bash
bunx tauri signer generate -w ~/.tauri/m3m.key -p ""
```

This prints a **public key**. Paste it into `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.

### 2. Add GitHub repository secrets

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Value |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Contents of `~/.tauri/m3m.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | The password used above (empty if `-p ""`) |

### 3. Create a GitHub PAT

Go to **Settings → Developer settings → Personal access tokens → Tokens (fine-grained) → Generate new token**.

Required permission: **Contents → Read and write**.

Export it in your shell (add to `~/.zshrc` to persist):

```bash
export GITHUB_TOKEN=<your-pat>
```

### 4. Install release-plz

```bash
cargo install release-plz
```

---

## Cutting a release

### Initial release (v0.1.0)

For the very first release, tag manually — release-plz has no previous tag to compare against:

```bash
git tag v0.1.0
git push origin v0.1.0
```

### Subsequent releases

```bash
# 1. Bump version in Cargo.toml and update CHANGELOG.md based on commits
release-plz update --manifest-path src-tauri/Cargo.toml

# 2. Review the changes, then commit
git add src-tauri/Cargo.toml src-tauri/Cargo.lock CHANGELOG.md
git commit -m "chore: release vX.Y.Z"
git push

# 3. Create the GitHub Release and push the tag
release-plz release --manifest-path src-tauri/Cargo.toml
```

Step 3 uses `GITHUB_TOKEN` from the environment (see setup above).

---

## What happens after the tag is pushed

GitHub Actions picks up the `v*` tag and runs `.github/workflows/release.yml`, which:

1. Builds in parallel: **macOS universal** (arm64 + x64), **Windows**, **Linux**
2. Signs all artifacts with the Tauri keypair
3. Generates `latest.json` — the endpoint the in-app updater polls
4. Uploads everything to a **draft** GitHub Release

Review the draft at `github.com/ronyevernaes/m3m/releases`, then publish it manually.

---

## Version bump semantics

`release-plz update` reads [Conventional Commits](https://www.conventionalcommits.org/) to determine the bump:

| Commit prefix | Bump |
|---|---|
| `fix:` | Patch |
| `feat:` | Minor |
| `feat!:` or `BREAKING CHANGE:` | Major |

---

## Changelog management

`release-plz update` auto-generates `CHANGELOG.md` entries from commit messages since the last tag. It only picks up commits that follow the Conventional Commits format — freeform messages like `"bug fix"` or `"update styles"` are silently ignored.

### Writing commit messages that produce good changelog entries

Write the subject line as a user-facing sentence, not a code description:

```
# Too technical — describes the code, not the value
fix: resolve snake_case/camelCase mismatch in settings deserialization

# Better — describes what the user experiences
fix: "reopen last vault" preference now takes effect on app launch

# Too vague — ignored by release-plz
bug fix
```

The subject line is what ends up verbatim in the changelog, so make it something a user can understand without knowing the codebase.

Use the commit **body** for implementation notes if needed — it does not appear in the changelog.

### Transition period

Until all commits consistently follow Conventional Commits, run `release-plz update` and then review the generated `CHANGELOG.md` before committing. Touch up any entries that are too technical, and manually add any user-visible changes that came from non-conventional commits.

The goal is to reach a point where `release-plz update` output needs no editing. Track progress: fewer manual edits per release means the commit discipline is working.
