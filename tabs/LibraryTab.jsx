// ── Library ──────────────────────────────────────────────────────────────
// Browse what you've built. Lifted from Chord Trainer's Library, minus the
// Family/Builder dual filter panel: those seven sonic-family tests and the
// additive triad→7th→extensions builder exist to make a fixed 200-voicing set
// navigable. A library you built yourself is a few dozen chords you already
// know, so a search box and the category strip are enough — and dropping them
// is most of what makes this version focused.

import { useState, useMemo, useRef } from 'react';
import ChordDiagram from '../components/ChordDiagram.jsx';
import ChordDetail from '../components/ChordDetail.jsx';
import { EmptyState } from '../components/ui.jsx';
import { CATS } from '../data/theory.js';
import { ACCENT } from '../lib/tool.js';

// Sentinel for the ★ pill. Safe alongside real CATS keys because it is not one
// — `unassigned` is the only key that could ever look like a status.
const MASTERED_FILTER = '__mastered__';

export default function LibraryTab({ chords, showDeg, setShowDeg, mastered, onToggleMastered, scrollRef, onGoBuild, onEditChord }) {
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null);
  const savedScrollY = useRef(0);

  // `cat` doubles as the filter slot: 'all', a CATS key, or the pseudo-category
  // 'mastered'. Status is not a category, but it is the same one-tap question
  // ("show me just these"), so it belongs in the same strip rather than in a
  // second row of controls.
  const list = useMemo(() => {
    let r = cat === 'all' ? chords
      : cat === MASTERED_FILTER ? chords.filter(c => mastered?.has(c.id))
        : chords.filter(c => c.cat === cat);
    const q = search.trim().toLowerCase();
    if (q) r = r.filter(c => c.name.toLowerCase().includes(q) || c.sym.toLowerCase().includes(q));
    return r;
  }, [chords, cat, search, mastered]);

  const chord = sel ? chords.find(c => c.id === sel) : null;

  const handleSel = id => {
    savedScrollY.current = scrollRef?.current ? scrollRef.current.scrollTop : 0;
    if (scrollRef?.current) scrollRef.current.scrollTop = 0;
    setSel(id);
  };

  if (chord) {
    return <ChordDetail chord={chord} onBack={() => { setSel(null); requestAnimationFrame(() => { if (scrollRef?.current) scrollRef.current.scrollTop = savedScrollY.current; }); }}
      showDeg={showDeg} setShowDeg={setShowDeg} mastered={mastered} onToggleMastered={onToggleMastered} onEdit={onEditChord} />;
  }

  if (chords.length === 0) {
    return <EmptyState icon="📚" title="Your library is empty"
      body="This is where the chords you build live. Add one and it shows up here, in your daily practice, and in the quizzes."
      action="Build your first chord" onAction={onGoBuild} />;
  }

  // Only offer categories that actually have chords in them.
  const usedCats = Object.keys(CATS).filter(k => chords.some(c => c.cat === k));
  const nMastered = mastered?.size || 0;
  // The strip earns its space if there is more than one category *or* anything
  // mastered — a single-category library still wants the ★ filter.
  const showStrip = usedCats.length > 1 || nMastered > 0;

  return (
    <div style={{ padding: '14px', maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>Your Library</div>
        <div style={{ color: '#999', fontSize: '11px' }}>{chords.length} chord{chords.length === 1 ? '' : 's'}{mastered?.size ? ` · ${mastered.size} mastered` : ''}</div>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or symbol…"
        style={{ width: '100%', background: '#13121f', border: '1px solid #2a2840', borderRadius: '9px', padding: '9px 12px', color: '#fff', fontSize: '13px', marginBottom: '10px', outline: 'none' }} />

      {showStrip && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <button onClick={() => setCat('all')} style={{ padding: '5px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '10px', fontWeight: 700, border: 'none', background: cat === 'all' ? ACCENT : '#13121f', color: cat === 'all' ? '#111' : '#777', transition: 'all .15s' }}>All</button>
          {nMastered > 0 && (() => {
            const on = cat === MASTERED_FILTER;
            return (
              <button onClick={() => setCat(on ? 'all' : MASTERED_FILTER)}
                style={{ padding: '5px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '10px', fontWeight: 700, border: `1px solid ${on ? ACCENT : ACCENT + '33'}`, background: on ? ACCENT + '22' : '#13121f', color: on ? ACCENT : '#666', transition: 'all .15s' }}>
                ★ Mastered <span style={{ opacity: 0.7 }}>({nMastered})</span>
              </button>
            );
          })()}
          {usedCats.map(k => {
            const c = CATS[k], n = chords.filter(x => x.cat === k).length, on = cat === k;
            return (
              <button key={k} onClick={() => setCat(on ? 'all' : k)} style={{ padding: '5px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '10px', fontWeight: 700, border: `1px solid ${on ? c.color : c.color + '33'}`, background: on ? c.color + '22' : '#13121f', color: on ? c.color : '#666', transition: 'all .15s' }}>
                {c.label} <span style={{ opacity: 0.7 }}>({n})</span>
              </button>
            );
          })}
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px', color: '#888', fontSize: '13px' }}>No chords match.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
          {list.map(c => {
            const ci = CATS[c.cat] || { label: c.cat || 'Chord', color: ACCENT };
            const isMastered = mastered?.has(c.id);
            return (
              <div key={c.id} onClick={() => handleSel(c.id)}
                style={{ background: '#13121f', borderRadius: '11px', padding: '10px', border: `1px solid ${ci.color}33`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                <ChordDiagram v={c.voicings[0]} showDeg={showDeg} size={0.95} />
                <div style={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isMastered && <span style={{ color: ACCENT, marginRight: '3px' }}>★</span>}{c.name}
                  </div>
                  <div style={{ fontSize: '9px', color: ci.color, marginTop: '1px' }}>{ci.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
