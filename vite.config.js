import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build stamp shown in Settings → App Updates, so a user can confirm an update
// actually landed. Auto-bumps every build; injected via `define` below.
const BUILD_ID = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'

export default defineConfig({
  // Served under /focus on the unified domain (Vercel multi-zone). All asset
  // URLs are emitted with this prefix so they resolve through the shell.
  base: '/focus/',
  // Replaced at build time (and in dev) wherever __BUILD_ID__ appears in source.
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  // Single page: unlike Chord Trainer there is no separate editor.html — the
  // chord editor is the Build tab, because the library it edits lives in
  // localStorage rather than in a repo file.
  //
  // No PWA plugin here: under the unified Fretworks origin the shell owns the
  // single service worker + manifest. Offline for /focus is handled by the
  // shell SW's runtime caching (see fretworks/public/sw.js).
  plugins: [
    react(),
  ],
})
