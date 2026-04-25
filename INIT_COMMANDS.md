# m3m — Init Commands
# Run from your project directory: ~/code/ronyevernaes/m3m
# Execute each block manually and verify before proceeding to the next.

# ── 0. Prerequisites ──────────────────────────────────────────────────────────

brew install mise
brew install git

# Add mise to your shell (add this line to ~/.zshrc permanently)
eval "$(mise activate zsh)"


# ── 1. Install toolchain (no .mise.toml yet — create-vite would wipe it) ─────

mise use --global rust@stable
mise use --global bun@1.3.13

# Verify
rustc --version
cargo --version
bun --version


# ── 2. Tauri CLI ──────────────────────────────────────────────────────────────

cargo install tauri-cli --version "^2" --locked

# Verify
cargo tauri --version


# ── 3. Scaffold ───────────────────────────────────────────────────────────────

# 3a. Vite + React/TS FIRST — create-vite --overwrite wipes the directory,
#     so run it before cargo tauri init to avoid losing src-tauri/.
bunx create-vite@latest . --template react-ts --overwrite

# 3b. Restore project files wiped by create-vite (already in project dir).
#     Copy from parent if you stored them one level up; adjust path as needed.
#     Skip any file that survived (create-vite only touches its own template files).

# 3c. Tauri backend — adds src-tauri/ on top of the existing React scaffold.
#     web assets:        ../dist
#     dev server URL:    http://localhost:5173
#     before dev:        bun run dev
#     before build:      bun run build
#     app name:          m3m
#     window title:      m3m
cargo tauri init \
  --app-name "m3m" \
  --window-title "m3m" \
  --frontend-dist "../dist" \
  --dev-url "http://localhost:5173" \
  --before-dev-command "bun run dev" \
  --before-build-command "bun run build" \
  --force \
  --ci

# 3d. Recreate .mise.toml (wiped by create-vite --overwrite)
cat > .mise.toml << 'EOF'
[tools]
rust = "stable"
bun  = "1.3.13"

[env]
CARGO_HOME = "/Users/rvernaes/.cargo"
_.path     = ["/Users/rvernaes/.cargo/bin"]
EOF


# ── 4. Frontend dependencies ──────────────────────────────────────────────────

bun install

# Editor
bun add @tiptap/react @tiptap/starter-kit @tiptap/extension-link \
        @tiptap/extension-code-block-lowlight lowlight

# Graph
bun add @xyflow/react

# Markdown / frontmatter
bun add gray-matter remark remark-parse remark-stringify unified

# Sync
bun add @automerge/automerge

# Utilities
bun add @tanstack/react-query zustand date-fns ulid

# Dev tooling
bun add -d @types/node tailwindcss @tailwindcss/vite prettier \
           eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin


# ── 5. Testing ────────────────────────────────────────────────────────────────

bun add -d vitest @vitest/ui @vitest/coverage-v8 jsdom \
           @testing-library/react @testing-library/user-event \
           @testing-library/jest-dom

mkdir -p src/test

cat > src/test/setup.ts << 'EOF'
import '@testing-library/jest-dom'
EOF

cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'src/store/**', 'src/hooks/**'],
      exclude: ['src/components/**', 'src/test/**'],
    },
  },
})
EOF


# ── 6. Rust crate dependencies ────────────────────────────────────────────────

cd src-tauri

cargo add tauri --features "wry"
cargo add tauri-plugin-shell
cargo add tauri-plugin-fs
cargo add tauri-plugin-dialog
cargo add tauri-plugin-opener
cargo add notify --features "macos_fsevent"
cargo add sqlx --features "runtime-tokio-native-tls,sqlite,macros"
# lancedb requires protoc at build time: brew install protobuf
cargo add lancedb
# Pin arrow-array to the same major.minor as lancedb's arrow (53.x) to avoid
# chrono version conflicts between the two arrow generations.
cargo add arrow-array@53
cargo add reqwest --features "json,stream"
cargo add tokio --features "full"
cargo add automerge
cargo add sodiumoxide
cargo add serde --features "derive"
cargo add serde_json
cargo add ulid
cargo add anyhow
cargo add thiserror

cd ..


# ── 7. Project structure ──────────────────────────────────────────────────────

# Rust
mkdir -p src-tauri/src/{commands,models,tests}
touch src-tauri/src/commands/{mod.rs,notes.rs,search.rs,ai.rs,sync.rs,graph.rs}
touch src-tauri/src/{indexer.rs,ai.rs,sync.rs}
touch src-tauri/src/tests/{mod.rs,indexer_test.rs,frontmatter_test.rs,sync_test.rs}

# React
mkdir -p src/{components/{editor,graph,sidebar,search},hooks,lib,store,types}
touch src/components/editor/{Editor.tsx,EditorToolbar.tsx}
touch src/components/graph/GraphView.tsx
touch src/components/sidebar/{Sidebar.tsx,TagList.tsx,BacklinkPanel.tsx}
touch src/components/search/{SearchBar.tsx,SearchResults.tsx}
touch src/hooks/{useVault.ts,useSearch.ts,useAI.ts}
touch src/lib/{frontmatter.ts,ulid.ts,ipc.ts}
touch src/store/{vault.ts,settings.ts,ui.ts}
touch src/types/{note.ts,settings.ts,graph.ts}


# ── 8. Tailwind config ────────────────────────────────────────────────────────

cat > tailwind.config.ts << 'EOF'
import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
EOF


# ── 9. Vite config ────────────────────────────────────────────────────────────

cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_ENV_DEBUG,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
EOF


# ── 10. package.json scripts ──────────────────────────────────────────────────

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = {
  ...pkg.scripts,
  'test':          'vitest',
  'test:ui':       'vitest --ui',
  'test:run':      'vitest run --passWithNoTests',
  'test:coverage': 'vitest run --coverage',
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('done');
"


# ── 11. .gitignore ────────────────────────────────────────────────────────────

cat >> .gitignore << 'EOF'

# Bun lockfile (text format, Bun 1.1+)
bun.lock

# Coverage
coverage/

# Rust / Tauri build artifacts
target/
src-tauri/target/
*.pdb
WixTools/

# mise — gitignored because it contains an absolute home path
.mise.toml

# Vault runtime files
.vault/
*.lance/
EOF


# ── 12. Prettier config ───────────────────────────────────────────────────────

cat > .prettierrc << 'EOF'
{ "semi": false, "singleQuote": true, "printWidth": 100 }
EOF


# ── 13. Git ───────────────────────────────────────────────────────────────────

git init
git add .
git commit -m "chore: initial scaffold — m3m (Tauri + React/TS + Bun + Vitest)"
git remote add origin https://github.com/ronyevernaes/m3m.git
git push -u origin main


# ── Done ──────────────────────────────────────────────────────────────────────

# Start dev server
cargo tauri dev

# Run tests
bun test:run
