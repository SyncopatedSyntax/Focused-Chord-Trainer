// ── App header ───────────────────────────────────────────────────────────
// @fretworks/design's AppHeader resolves the tool's name and accent through
// toolByKey() alone, so it renders an empty title for any tool not yet in the
// registry. The registry entry for `focus` ships in a separate PR against
// fretworks-design; until that merges and the git dependency is refetched,
// this component renders the same chrome from the local descriptor instead.
//
// Once the registry knows about `focus`, the first branch takes over and this
// fallback stops being used — the markup and CSS classes are identical either
// way, so nothing shifts visually when that happens.

import { useState } from 'react';
import { AppHeader, ToolDrawer, KOFI, HOME_PATH, toolByKey } from '@fretworks/design';
import { TOOL } from '../lib/tool.js';

export default function FocusHeader({ children }) {
  const registered = !!toolByKey(TOOL.key);
  if (registered) return <AppHeader toolKey={TOOL.key}>{children}</AppHeader>;
  return <LocalHeader>{children}</LocalHeader>;
}

// Mirrors AppHeader.jsx exactly, with TOOL standing in for the registry entry.
function LocalHeader({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="fw-topbar fw-appheader" style={{ '--accent': TOOL.accent }}>
        <button
          className="fw-hamburger"
          onClick={() => setOpen(true)}
          aria-label="Open tools menu"
          aria-expanded={open}
        >
          <span /><span /><span />
        </button>

        <a className="fw-appheader-brand" href={HOME_PATH} aria-label={`${TOOL.name} — all tools`}>
          <span className="fw-appheader-name">{TOOL.name}</span>
        </a>

        <div className="fw-appheader-right">
          {children ? <div className="fw-appheader-actions">{children}</div> : null}
          <a
            className="fw-appheader-kofi"
            href={KOFI}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Support on Ko-fi"
          >
            <span className="fw-kofi-full">☕ Ko-fi</span>
            <span className="fw-kofi-icon" aria-hidden="true">☕</span>
          </a>
        </div>
      </header>

      <ToolDrawer open={open} onClose={() => setOpen(false)} current={TOOL.key} />
    </>
  );
}
