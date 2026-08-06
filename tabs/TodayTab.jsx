// ── Today ────────────────────────────────────────────────────────────────
// The SRS review queue, lifted from Chord Trainer's ChordsOfDay. The only thing
// removed is the "Progression of the Day" card that sat above it — that belongs
// to the chord-progression feature, not to spaced repetition.

import { useState, useCallback, useRef, memo } from 'react';
import ChordDiagram from '../components/ChordDiagram.jsx';
import PlayButtons from '../components/PlayButtons.jsx';
import ChordDetail from '../components/ChordDetail.jsx';
import { EmptyState } from '../components/ui.jsx';
import { CATS } from '../data/theory.js';
import { getDailyChords, todayStr } from '../lib/srs.js';
import { ACCENT } from '../lib/tool.js';

const TodayTab = memo(function TodayTab({ chords, srsData, showDeg, setShowDeg, onMarkReviewed, mastered, onToggleMastered, scrollRef, onGoBuild }) {
  // Snapshot the day's set AND the srs data at mount — the display then never
  // shifts under the user while they work through it, so the parent's saves
  // (which do re-render this component when `mastered` changes) can't reorder
  // or swap cards mid-session.
  const [daily] = useState(() => getDailyChords(chords, srsData, mastered));
  const [srsSnap] = useState(() => ({ ...srsData }));
  const [reviewed, setReviewed] = useState(new Set());
  const [selChord, setSelChord] = useState(null);
  const savedScrollY = useRef(0);

  const mark = useCallback(id => {
    setReviewed(p => new Set([...p, id]));
    onMarkReviewed(id); // fire-and-forget — parent state updates don't re-render us
  }, [onMarkReviewed]);

  if (selChord) {
    return <ChordDetail chord={selChord} onBack={() => { setSelChord(null); requestAnimationFrame(() => { if (scrollRef?.current) scrollRef.current.scrollTop = savedScrollY.current; }); }} showDeg={showDeg} setShowDeg={setShowDeg} mastered={mastered} onToggleMastered={onToggleMastered} />;
  }

  if (chords.length === 0) {
    return <EmptyState icon="🌅" title="Nothing to practise yet"
      body="Your library is empty. Build a chord and it goes straight into the spaced-repetition rotation — you'll see it here tomorrow, and less often as you get it right."
      action="Build your first chord" onAction={onGoBuild} />;
  }

  return (
    <div style={{ padding: '14px', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>Chords of the Day</div>
        <div style={{ color: '#999', fontSize: '11px', marginTop: '1px' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
        <div style={{ marginTop: '6px', padding: '7px 10px', background: '#13121f', borderRadius: '8px', border: '1px solid #2a2840' }}>
          <div style={{ fontSize: '11px', color: '#bbb', lineHeight: '1.5' }}>
            <span style={{ color: ACCENT, fontWeight: 700 }}>Spaced Repetition (SRS)</span> — chords you know well appear less often. Chords you struggle with come back sooner. Mark each one "Got it" to update the schedule.
          </div>
        </div>
      </div>
      {daily.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
          <div style={{ fontSize: '26px', marginBottom: '4px' }}>✅</div>
          <div style={{ fontWeight: 700, color: '#ccc', fontSize: '12px' }}>All caught up for today!</div>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>Nothing is due. Add more chords in Build, or drill your weak spots.</div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '7px' }}><span style={{ background: '#1a1928', borderRadius: '8px', padding: '3px 10px', fontSize: '10px', color: ACCENT }}>{reviewed.size}/{daily.length} reviewed</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {daily.map((chord, idx) => {
              // Snapshot values — stable, never change mid-session.
              const ci = CATS[chord.cat] || { label: chord.cat || 'Chord', color: ACCENT };
              const srsEntry = srsSnap[chord.id];
              const isNew = !srsEntry;
              const isDue = srsEntry && srsEntry.nextDue <= todayStr();
              const done = reviewed.has(chord.id);
              return (
                <div key={chord.id} style={{
                  background: '#13121f', borderRadius: '11px', padding: '10px',
                  border: `1px solid ${done ? '#00b89444' : ci.color + '33'}`,
                  display: 'flex', alignItems: 'center', gap: '9px',
                  opacity: done ? 0.55 : 1,
                  willChange: 'opacity',
                  transition: 'opacity .25s ease',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#444', minWidth: '13px', textAlign: 'center' }}>{idx + 1}</div>
                  {/* Tappable area — opens chord detail */}
                  <div onClick={() => { savedScrollY.current = scrollRef?.current ? scrollRef.current.scrollTop : 0; if (scrollRef?.current) scrollRef.current.scrollTop = 0; setSelChord(chord); }} style={{ display: 'flex', alignItems: 'center', gap: '9px', flex: 1, minWidth: 0, cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                    <ChordDiagram v={chord.voicings[0]} showDeg={showDeg} size={0.76} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '1px' }}>
                        <span style={{ fontWeight: 700, fontSize: '12px', color: '#fff' }}>{chord.name}</span>
                        {isNew && <span style={{ fontSize: '8px', background: '#a29bfe22', color: '#a29bfe', padding: '1px 5px', borderRadius: '5px', fontWeight: 700 }}>NEW</span>}
                        {isDue && !isNew && <span style={{ fontSize: '8px', background: ACCENT + '22', color: ACCENT, padding: '1px 5px', borderRadius: '5px', fontWeight: 700 }}>REVIEW</span>}
                      </div>
                      <div style={{ fontSize: '8px', color: ci.color, marginBottom: '1px' }}>{ci.label}</div>
                      <div style={{ fontSize: '8px', color: '#777' }}>{chord.voicings[0].label}</div>
                      {/* Always rendered (stable height) — no conditional mount/unmount */}
                      <div style={{ fontSize: '8px', color: '#555', marginTop: '1px', minHeight: '11px' }}>
                        {srsEntry ? `${srsEntry.reps} reps · next in ${srsEntry.interval}d` : ' '}
                      </div>
                      <div style={{ marginTop: '5px' }}>
                        <PlayButtons v={chord.voicings[0]} size="sm" />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => !done && mark(chord.id)}
                    style={{
                      background: done ? '#00b89422' : ACCENT + '22',
                      color: done ? '#00b894' : ACCENT,
                      border: `1px solid ${done ? '#00b89444' : ACCENT + '88'}`,
                      padding: '7px 8px', borderRadius: '8px',
                      cursor: done ? 'default' : 'pointer',
                      fontSize: '11px', fontWeight: 700,
                      whiteSpace: 'nowrap', minHeight: '44px', minWidth: '64px',
                      // Hard lock: once done, no pointer events whatsoever
                      pointerEvents: done ? 'none' : 'auto',
                      // Only transition visual properties, never layout/text
                      transition: 'background .2s,color .2s,border-color .2s',
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                    }}
                  >{done ? '✓ Done' : 'Got it'}</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
// Custom comparator: re-render on showDeg or mastered changes only. srsData
// changes (from the parent's saves) are ignored because it was snapshotted at
// mount; onMarkReviewed is stable via the parent's ref pattern. `chords` is
// snapshotted into `daily` too, so a chord added mid-session appears tomorrow
// rather than shuffling today's card list underfoot.
}, (prev, next) => prev.showDeg === next.showDeg && prev.mastered === next.mastered);

export default TodayTab;
