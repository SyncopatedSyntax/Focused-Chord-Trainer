// ── Weak spots ───────────────────────────────────────────────────────────
// Auto-tracked problem areas, lifted from Chord Trainer. Both selectors now
// take the user's library as their first argument (see lib/srs.js) instead of
// closing over a static chord list.

import { useState, useMemo } from 'react';
import ChordDiagram from '../components/ChordDiagram.jsx';
import { EmptyState } from '../components/ui.jsx';
import { CATS, DC, DEG_HINT } from '../data/theory.js';
import { getWeakChords, getWeakDegrees } from '../lib/srs.js';
import { ChordQuiz } from './QuizTab.jsx';
import { ACCENT } from '../lib/tool.js';

export default function WeakTab({ chords, history, degHist, srs, showDeg, onComplete, onGoBuild }) {
  const [mode, setMode] = useState('chords');
  const [drilling, setDrilling] = useState(false);
  const weak = useMemo(() => getWeakChords(chords, history, srs), [chords, history, srs]);
  const weakDegs = useMemo(() => getWeakDegrees(chords, degHist), [chords, degHist]);

  if (drilling) return <ChordQuiz chords={chords} showDeg={showDeg} pool={weak} onComplete={r => { onComplete(r); setDrilling(false); }} onBack={() => setDrilling(false)} />;

  if (chords.length === 0) {
    return <EmptyState icon="💪" title="Nothing tracked yet"
      body="Once you've built some chords and quizzed yourself, the ones you keep missing collect here for a one-tap drill."
      action="Build your first chord" onAction={onGoBuild} />;
  }

  return (<div style={{ padding: '14px', maxWidth: '540px', margin: '0 auto' }}>
    <div style={{ display: 'flex', gap: '0', marginBottom: '14px', background: '#13121f', borderRadius: '10px', padding: '3px', border: '1px solid #2a2840' }}>
      {[{ id: 'chords', label: `🎸 Weak Chords (${weak.length})` }, { id: 'degrees', label: `🎼 Weak Degrees (${weakDegs.length})` }].map(m => (
        <button key={m.id} onClick={() => setMode(m.id)} style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', cursor: 'pointer', border: 'none', background: mode === m.id ? '#2a2840' : 'transparent', color: mode === m.id ? ACCENT : '#888', fontSize: '11px', fontWeight: 700, transition: 'all .15s' }}>{m.label}</button>))}
    </div>

    {mode === 'chords' && (<div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '5px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff' }}>Weak Chords</div>
          <div style={{ color: '#999', fontSize: '11px', marginTop: '1px' }}>Any incorrect answer or degraded SRS score</div>
        </div>
        {weak.length > 0 && <button onClick={() => setDrilling(true)} style={{ background: '#ff6b6b', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '9px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', minHeight: '40px' }}>Drill ({weak.length}) 🎯</button>}
      </div>
      {weak.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px', color: '#888' }}><div style={{ fontSize: '32px', marginBottom: '5px' }}>🎉</div><div style={{ fontWeight: 700, color: '#ccc', fontSize: '13px' }}>No weak chords yet!</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {weak.map(chord => {
            const ci = CATS[chord.cat] || { label: chord.cat || 'Chord', color: ACCENT };
            const pct = chord.stats.n > 0 ? Math.round(chord.stats.ok / chord.stats.n * 100) : null;
            return (
              <div key={chord.id} style={{ background: '#13121f', borderRadius: '10px', padding: '9px', border: `1px solid ${ci.color}33`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChordDiagram v={chord.voicings[0]} showDeg={showDeg} size={0.72} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#fff' }}>{chord.name}</div>
                  <div style={{ fontSize: '8px', color: ci.color, marginBottom: '3px' }}>{ci.label}</div>
                  {pct !== null && <>
                    <div style={{ background: '#1a1928', borderRadius: '3px', height: '3px', marginBottom: '2px' }}><div style={{ background: pct >= 70 ? '#00b894' : '#ff6363', height: '3px', borderRadius: '3px', width: `${pct}%` }} /></div>
                    <div style={{ fontSize: '8px', color: '#999' }}>{pct}% · {chord.stats.n} attempts</div>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>)}

    {mode === 'degrees' && (<div>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff' }}>Weak Scale Degrees</div>
        <div style={{ color: '#999', fontSize: '11px', marginTop: '1px' }}>Below 70% accuracy</div>
      </div>
      {weakDegs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px', color: '#888' }}><div style={{ fontSize: '32px', marginBottom: '5px' }}>🎉</div><div style={{ fontWeight: 700, color: '#ccc', fontSize: '13px' }}>No weak degrees yet!</div><div style={{ fontSize: '11px', marginTop: '3px' }}>Complete Scale Degree training to see results.</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {weakDegs.map((r, i) => {
            const ci = CATS[r.chord.cat] || { label: r.chord.cat || 'Chord', color: ACCENT };
            const pct = Math.round(r.ok / r.n * 100);
            return (
              <div key={i} style={{ background: '#13121f', borderRadius: '10px', padding: '9px', border: `1px solid ${DC[r.deg] || ACCENT}33`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChordDiagram v={r.chord.voicings[0]} showDeg={true} size={0.72} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#fff' }}>{r.chord.name}</div>
                  <div style={{ fontSize: '9px', color: ci.color, marginBottom: '3px' }}>{ci.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: DC[r.deg] || ACCENT, background: (DC[r.deg] || ACCENT) + '22', padding: '1px 6px', borderRadius: '6px' }}>{r.deg}</span>
                    <span style={{ fontSize: '9px', color: '#888' }}>{DEG_HINT[r.deg] || ''}</span>
                  </div>
                  <div style={{ background: '#1a1928', borderRadius: '3px', height: '3px', marginBottom: '2px' }}><div style={{ background: pct >= 70 ? '#00b894' : '#ff6363', height: '3px', borderRadius: '3px', width: `${pct}%` }} /></div>
                  <div style={{ fontSize: '8px', color: '#999' }}>{pct}% · {r.n} attempts</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>)}
  </div>);
}
