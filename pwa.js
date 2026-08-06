// ── Single-PWA mode ──────────────────────────────────────────────────────
// Under the unified Fretworks origin the SHELL owns the only service worker.
// This trainer registers none, so there is exactly one SW per origin.
// `reloadApp` (the in-app "Update" button) just reloads, and as hygiene it
// unregisters any legacy per-trainer SW that may linger from an older deploy.
export async function reloadApp() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs
          .filter((r) => (r.scope || '').includes('/focus'))
          .map((r) => r.unregister().catch(() => {}))
      );
    }
  } catch (e) {}
  window.location.reload();
}
