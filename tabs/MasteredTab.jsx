// ── Mastered ─────────────────────────────────────────────────────────────
// The trophy shelf. Everything here is readable elsewhere — the Library shows
// a ★ on each card and a count in its header — but scattered across a list you
// have to scan. Collected in one place it answers a different question: not
// "is this one done" but "how far have I come", which is the part worth
// looking at.
//
// Mastering is a manual retire switch, not an SRS state: getDailyChords()
// stops scheduling a mastered chord. So this tab is also where you undo it —
// tapping through to the detail view gives back the same ★ toggle.

import { useState, useMemo, useRef } from 'react';
import ChordDiagram from '../components/ChordDiagram.jsx';
import ChordDetail from '../components/ChordDetail.jsx';
import { EmptyState } from '../components/ui.jsx';
import { CATS } from '../data/theory.js';
import { todayStr } from '../lib/srs.js';
import { ACCENT } from '../lib/tool.js';

const DAY = 86400000;
const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);

// Short, human relative date. Undated chords (mastered before the date was
// recorded) return null and simply render without a caption.
function relDate(iso, today) {
  if (!iso) return null;
  const d = dayDiff(iso, today);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 14) return 'last week';
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

// A line that changes as the shelf fills. Milestones are proportional rather
// than absolute so they land the same for a 12-chord library and a 60-chord one.
function milestone(n, total) {
  if (n === 1) return 'Your first mastered chord.';
  const pct = total ? n / total : 0;
  if (n === total) return 'Every chord in your library. Time to build more.';
  if (pct >= 0.75) return 'Three quarters of your library.';
  if (pct >= 0.5) return 'Over half your library.';
  // This bucket runs to 49%, so it can't claim a fraction.
  if (pct >= 0.25) return 'Well under way.';
  return `${n} down.`;
}

export default function MasteredTab({ chords, mastered, masteredAt, showDeg, setShowDeg, onToggleMastered, scrollRef, onGoBuild, onEditChord }) {
  const [sel, setSel] = useState(null);
  const savedScrollY = useRef(0);
  const today = todayStr();

  const total = chords.length;
  const list = useMemo(() => {
    const m = chords.filter(c => mastered?.has(c.id));
    // Newest first; undated ones sort last, since they predate the record.
    return m.sort((a, b) => (masteredAt?.[b.id] || '').localeCompare(masteredAt?.[a.id] || ''));
  }, [chords, mastered, masteredAt]);

  const n = list.length;
  const pct = total ? Math.round((n / total) * 100) : 0;

  // How many landed in the last 30 days — the "still moving" signal, and the
  // one number here that can go down as well as up.
  const recent = useMemo(
    () => list.filter(c => masteredAt?.[c.id] && dayDiff(masteredAt[c.id], today) < 30).length,
    [list, masteredAt, today],
  );

  const chord = sel ? chords.find(c => c.id === sel) : null;
  const handleSel = id => {
    savedScrollY.current = scrollRef?.current ? scrollRef.current.scrollTop : 0;
    if (scrollRef?.current) scrollRef.current.scrollTop = 0;
    setSel(id);
  };

  if (chord) {
    return <ChordDetail chord={chord}
      onBack={() => { setSel(null); requestAnimationFrame(() => { if (scrollRef?.current) scrollRef.current.scrollTop = savedScrollY.current; }); }}
      showDeg={showDeg} setShowDeg={setShowDeg} mastered={mastered} onToggleMastered={onToggleMastered} onEdit={onEditChord} />;
  }

  if (total === 0) {
    return <EmptyState icon="🏆" title="Nothing mastered yet"
      body="Build a few chords and practise them. When one is solid, mark it Mastered from its detail view and it retires here — out of the daily queue, but never lost."
      action="Build your first chord" onAction={onGoBuild} />;
  }

  if (n === 0) {
    return <EmptyState icon="🏆" title="Nothing mastered yet"
      body={`You have ${total} chord${total === 1 ? '' : 's'} in rotation. Open one from the Library and tap ☆ Master when it's solid — it stops coming up in daily practice and lands here.`} />;
  }

  return (
    <div style={{ padding: '14px', maxWidth: '640px', margin: '0 auto' }}>
      {/* Progress */}
      <div style={{ background: '#13121f', border: `1px solid ${ACCENT}33`, borderRadius: '13px', padding: '14px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '30px', fontWeight: 900, color: ACCENT, lineHeight: 1, fontFamily: 'var(--font-heading)' }}>{n}</div>
          <div style={{ fontSize: '13px', color: '#999' }}>of {total} mastered</div>
          <div style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 800, color: ACCENT, fontFamily: 'var(--font-mono)' }}>{pct}%</div>
        </div>

        <div style={{ height: '9px', background: '#0f0e17', borderRadius: '5px', marginTop: '10px', overflow: 'hidden', border: '1px solid #2a2840' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: ACCENT, borderRadius: '5px', transition: 'width .4s ease' }} />
        </div>

        <div style={{ fontSize: '12px', color: '#ccc', marginTop: '10px', fontWeight: 600 }}>{milestone(n, total)}</div>
        {recent > 0 && (
          <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
            {recent} in the last 30 days · {total - n} still in rotation
          </div>
        )}
      </div>

      {/* The shelf */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
        {list.map(c => {
          const ci = CATS[c.cat] || { label: c.cat || 'Chord', color: ACCENT };
          const when = relDate(masteredAt?.[c.id], today);
          return (
            <div key={c.id} onClick={() => handleSel(c.id)}
              style={{ background: '#13121f', borderRadius: '11px', padding: '10px', border: `1px solid ${ACCENT}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
              <ChordDiagram v={c.voicings[0]} showDeg={showDeg} size={0.95} />
              <div style={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
                <div style={{ fontWeight: 700, fontSize: '12px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ color: ACCENT, marginRight: '3px' }}>★</span>{c.name}
                </div>
                <div style={{ fontSize: '9px', color: ci.color, marginTop: '1px' }}>{ci.label}</div>
                {when && <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>{when}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: '10px', color: '#666', marginTop: '12px', textAlign: 'center', lineHeight: 1.5 }}>
        Mastered chords stay out of daily practice but still appear in quizzes.<br />Tap one to review it or put it back in rotation.
      </div>
    </div>
  );
}
