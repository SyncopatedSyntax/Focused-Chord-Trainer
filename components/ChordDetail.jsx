// ── Chord detail ─────────────────────────────────────────────────────────
// Shared by the Library and Today tabs. Lifted from Chord Trainer, minus the
// progression-chord special cases (there are no progression chords here, so
// every chord is a real library entry that can be mastered). Turns Scale
// Degrees on while open and restores the previous setting on the way out.

import { useState, useEffect } from 'react';
import ChordDiagram from './ChordDiagram.jsx';
import PlayButtons from './PlayButtons.jsx';
import { CATS, DC, DEG_HINT, NOTE_NAMES } from '../data/theory.js';
import { getRootNote, getValidTransposeRoots, transposeVoicing } from '../lib/voicing.js';
import { ACCENT } from '../lib/tool.js';

export default function ChordDetail({ chord, onBack, showDeg, setShowDeg, mastered, onToggleMastered, onEdit }) {
  const [transRoot, setTransRoot] = useState(null);
  // Local mirror so the button reflects the tap instantly — the parent's
  // `mastered` prop may not propagate if this sits inside a memo'd component.
  const [localMastered, setLocalMastered] = useState(() => !!(mastered && chord && mastered.has(chord.id)));

  useEffect(() => {
    const prev = showDeg;
    setShowDeg(true);
    return () => setShowDeg(prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!chord) return null;
  const ci = CATS[chord.cat] || { label: chord.cat || 'Chord', color: ACCENT };
  const currentRoot = getRootNote(chord.voicings[0]);
  const canTranspose = chord.movable && currentRoot !== null && chord.voicings[0].deg.some((d, i) => d === 'R' && chord.voicings[0].str[i] > 0);
  const displayVoicings = transRoot === null ? chord.voicings : chord.voicings.map(v => transposeVoicing(v, transRoot));
  const uniqueDegs = [...new Set(displayVoicings[0].deg?.filter(Boolean) || [])];

  const handleToggle = () => {
    setLocalMastered(m => !m);   // instant UI update
    onToggleMastered(chord.id);  // async persist to App state + storage
  };

  return (
    <div style={{ padding: '14px', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #2a2840', color: '#aaa', padding: '5px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', touchAction: 'manipulation' }}>← Back</button>
        {onEdit && <button onClick={() => onEdit(chord)} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #2a2840', color: '#aaa', padding: '5px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', touchAction: 'manipulation' }}>✏️ Edit</button>}
      </div>
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '10px', color: ci.color, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', background: ci.color + '18', padding: '3px 10px', borderRadius: '20px' }}>{ci.label}</span>
        <div style={{ fontSize: '24px', fontWeight: 900, margin: '8px 0 2px', color: '#fff' }}>{chord.name}</div>
        <div style={{ fontSize: '13px', color: '#aaa', fontStyle: 'italic' }}>{chord.sym}</div>
      </div>

      {canTranspose && (() => {
        const validRoots = getValidTransposeRoots(chord.voicings[0]);
        return (
          <div style={{ marginBottom: '14px', background: '#13121f', borderRadius: '10px', padding: '10px 12px', border: '1px solid #2a2840' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
              <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '2px' }}>Transpose root</div>
              {transRoot !== null && <button onClick={() => setTransRoot(null)} style={{ fontSize: '10px', color: '#aaa', background: 'transparent', border: '1px solid #2a2840', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', touchAction: 'manipulation' }}>Reset</button>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {NOTE_NAMES.map((n, i) => {
                const isActive = transRoot === null ? i === currentRoot : i === transRoot;
                const isOriginal = i === currentRoot;
                const canUse = validRoots.has(i);
                return (
                  <button key={i} onClick={() => canUse && setTransRoot(i === currentRoot ? null : i)} disabled={!canUse}
                    style={{
                      padding: '5px 8px', borderRadius: '7px', cursor: canUse ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: 700,
                      border: `1px solid ${isActive ? ACCENT : canUse ? '#2a2840' : '#1a1928'}`,
                      background: isActive ? ACCENT + '22' : 'transparent',
                      color: isActive ? ACCENT : canUse ? '#888' : '#333',
                      transition: 'all .15s', minHeight: '32px',
                      textDecoration: !canUse ? 'line-through' : 'none', opacity: !canUse ? 0.35 : 1,
                      touchAction: 'manipulation',
                    }}>
                    {n}{isOriginal && transRoot !== null ? '*' : ''}
                  </button>
                );
              })}
            </div>
            {transRoot !== null && <div style={{ fontSize: '11px', color: ACCENT, marginTop: '6px' }}>Showing {NOTE_NAMES[transRoot]} · fret {displayVoicings[0].sf} &nbsp;<span style={{ color: '#666', fontSize: '10px' }}>* = original root ({NOTE_NAMES[currentRoot]})</span></div>}
            {transRoot === null && <div style={{ fontSize: '10px', color: '#555', marginTop: '5px' }}>Greyed notes cannot be played in this shape</div>}
          </div>
        );
      })()}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginBottom: '14px' }}>
        {displayVoicings.map((v, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#13121f', borderRadius: '12px', padding: '16px', border: `2px solid ${ci.color}44` }}><ChordDiagram v={v} showDeg={true} size={1.85} /></div>
            {v.label && <div style={{ fontSize: '10px', color: '#888', maxWidth: '160px', textAlign: 'center' }}>{v.label}</div>}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <PlayButtons v={v} />
              {onToggleMastered && (
                <button onClick={handleToggle}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: localMastered ? ACCENT + '22' : 'transparent',
                    border: `1px solid ${localMastered ? ACCENT : '#2a2840'}`,
                    color: localMastered ? ACCENT : '#666',
                    padding: '7px 10px', borderRadius: '7px', cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                    minHeight: '38px',
                    transition: 'background .2s,color .2s,border-color .2s',
                    touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                  }}>
                  <span style={{ fontSize: '13px' }}>{localMastered ? '★' : '☆'}</span>
                  {localMastered ? 'Mastered' : 'Master'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {uniqueDegs.length > 0 && (
        <div style={{ padding: '10px 12px', background: '#13121f', borderRadius: '10px', border: '1px solid #2a2840' }}>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px', letterSpacing: '2px', textTransform: 'uppercase' }}>Scale degree guide</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
            {uniqueDegs.map(d => (
              <span key={d} style={{ background: DC[d] + '22', color: DC[d], padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, border: `1px solid ${DC[d]}44` }}>{d}</span>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {uniqueDegs.map(d => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', background: '#0f0e17', borderRadius: '7px', border: `1px solid ${DC[d]}33` }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: DC[d], flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: DC[d], minWidth: '28px' }}>{d}</span>
                <span style={{ fontSize: '11px', color: '#888', lineHeight: '1.3' }}>{DEG_HINT[d] || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
