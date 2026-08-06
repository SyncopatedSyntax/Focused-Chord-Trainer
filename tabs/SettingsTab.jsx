// ── Settings ─────────────────────────────────────────────────────────────
// Backup is the shared ProgressBackup widget from @fretworks/design, which
// exports and imports every localStorage key under a prefix. Because the chord
// library lives under the same `fct_` prefix as the SRS state, one backup file
// carries both — no bespoke export needed, unlike Chord Trainer where the
// library was a repo file and only progress was exportable.

import { useState } from 'react';
import { ProgressBackup } from '@fretworks/design';
import { reloadApp } from '../pwa.js';
import { PREFIX } from '../lib/library.js';
import { TOOL, ACCENT } from '../lib/tool.js';

const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

export default function SettingsTab({ chords, srs, hist, degHist }) {
  const [updating, setUpdating] = useState(false);
  const onUpdate = async () => {
    if (updating) return;
    setUpdating(true);
    try { await reloadApp(); } catch (e) {}
    // reloadApp reloads the page on success; if we're still here after a beat
    // with nothing to update, drop back to the idle label.
    setTimeout(() => setUpdating(false), 7000);
  };

  const card = { background: '#13121f', borderRadius: '11px', border: '1px solid #2a2840', padding: '11px 12px', marginBottom: '10px' };

  return (
    <div style={{ padding: '14px', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff', marginBottom: '10px' }}>Settings</div>

      {/* ── Backup ── */}
      <div style={card}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>📦 Backup</div>
        <div style={{ fontSize: '11px', color: '#888', marginTop: '2px', lineHeight: '1.4', marginBottom: '10px' }}>
          Everything lives on this device only. One file carries your whole chord library <i>and</i> your practice
          progress — export it before switching phones, and keep a copy somewhere safe. Importing replaces what's here.
        </div>
        <ProgressBackup toolKey={TOOL.key} prefix={PREFIX} />
        <div style={{ fontSize: '10px', color: '#555', marginTop: '8px' }}>
          {chords.length} chords · {Object.keys(srs).length} scheduled · {hist.length} quiz answers · {degHist.length} degree answers
        </div>
      </div>

      {/* ── App version / update ── */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>App Updates</div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px', lineHeight: '1.4' }}>{updating ? 'Checking for a new version and reloading…' : 'Installed and works offline. Tap Update to load the newest version when one is available.'}</div>
          <div style={{ fontSize: '10px', color: '#555', marginTop: '4px', fontFamily: 'monospace' }}>Build {BUILD_ID}</div>
        </div>
        <button onClick={onUpdate} disabled={updating}
          style={{
            background: ACCENT, color: '#111', border: 'none', padding: '9px 14px', borderRadius: '9px',
            fontSize: '12px', fontWeight: 800, cursor: updating ? 'default' : 'pointer', minHeight: '40px', whiteSpace: 'nowrap',
            opacity: updating ? 0.7 : 1, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
          }}>
          <span className={updating ? 'fct-spin' : ''}>↻</span> {updating ? 'Updating…' : 'Update'}
        </button>
      </div>

      {/* ── How this works ── */}
      <div style={card}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>How this works</div>
        <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.6' }}>
          <b style={{ color: '#bbb' }}>Build</b> adds a chord by shape: set each string's fret, mark the root, and the
          scale degrees derive themselves — so a note can't be saved with the wrong label. <b style={{ color: '#bbb' }}>Today</b> schedules
          what you've built using SM-2, the same algorithm Anki uses: get a chord right and it comes back later, get it
          wrong and it comes back tomorrow. <b style={{ color: '#bbb' }}>Quiz</b> and <b style={{ color: '#bbb' }}>Weak</b> feed
          that same schedule.
        </div>
      </div>
    </div>
  );
}
