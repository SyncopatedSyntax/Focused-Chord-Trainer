// ── Quizzes ──────────────────────────────────────────────────────────────
// Chord Quiz (Name↔Shape) and the Scale Degree trainer, lifted from Chord
// Trainer. Both drill the user's own library, which is the one substantive
// difference: a fixed 200-voicing set always has 3 plausible distractors on
// hand, a hand-built library might have two chords total. So the option count
// adapts, and both quizzes gate below a workable minimum instead of rendering
// something broken.

import { useState, useCallback, useMemo } from 'react';
import ChordDiagram from '../components/ChordDiagram.jsx';
import ClickableDiagram from '../components/ClickableDiagram.jsx';
import { EmptyState } from '../components/ui.jsx';
import { CATS, DC, DEG_HINT } from '../data/theory.js';
import { shuffle, getCharDegs } from '../lib/srs.js';
import { ACCENT } from '../lib/tool.js';

// A multiple-choice question needs a correct answer plus at least one
// distractor; 4 options is the design, fewer is a graceful degradation.
export const MIN_CHORDS = 4;
const MAX_OPTS = 4;

// ── Chord Quiz ───────────────────────────────────────────────────────────

function NameOpt({ opt, picked, correctId, onPick }) {
  const isSel = picked === opt, showFb = !!picked, isC = opt.id === correctId;
  const ci = CATS[opt.cat] || { label: opt.cat || 'Chord', color: ACCENT };
  return (<button onClick={() => onPick(opt)} style={{ background: !showFb ? '#13121f' : isC ? '#00b89420' : isSel ? '#ff636320' : '#13121f', border: `2px solid ${!showFb ? '#2a2840' : isC ? '#00b894' : isSel ? '#ff6363' : '#2a2840'}`, borderRadius: '10px', cursor: picked ? 'default' : 'pointer', padding: '10px 7px', transition: 'border-color 0.2s', textAlign: 'center', width: '100%', minHeight: '64px' }}>
    <div style={{ fontSize: '19px', fontWeight: 900, color: '#fff' }}>{opt.sym}</div>
    <div style={{ fontSize: '10px', color: '#bbb', marginTop: '2px' }}>{opt.name}</div>
    <div style={{ fontSize: '8px', color: ci.color, marginTop: '1px', fontWeight: 600 }}>{ci.label}</div>
    {showFb && <div style={{ fontSize: '13px', marginTop: '3px', color: isC ? '#00b894' : isSel ? '#ff6363' : 'transparent' }}>{isC ? '✓' : isSel ? '✗' : ' '}</div>}
  </button>);
}

function ShapeOpt({ opt, picked, correctId, onPick, showDeg, hideLabel }) {
  const isSel = picked === opt, showFb = !!picked, isC = opt.id === correctId;
  return (<button onClick={() => onPick(opt)} style={{ background: !showFb ? '#13121f' : isC ? '#00b89420' : isSel ? '#ff636320' : '#13121f', border: `2px solid ${!showFb ? '#2a2840' : isC ? '#00b894' : isSel ? '#ff6363' : '#2a2840'}`, borderRadius: '10px', cursor: picked ? 'default' : 'pointer', padding: '8px 5px', transition: 'border-color 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
    <ChordDiagram v={opt.voicings[0]} showDeg={showDeg} size={0.88} />
    {!hideLabel && <div style={{ fontSize: '8px', color: '#999', marginTop: '2px' }}>{opt.name}</div>}
    {showFb && <div style={{ fontSize: '13px', marginTop: '3px', color: isC ? '#00b894' : isSel ? '#ff6363' : 'transparent' }}>{isC ? '✓' : isSel ? '✗' : ' '}</div>}
  </button>);
}

const QL = 10;

// Distractors prefer the same category (a harder, more useful question), then
// fall back to anything else. Upstream this always yielded 3; here the pool can
// be genuinely small, so we take what exists rather than assuming.
function makeQ(pool, mode) {
  const c = pool[Math.floor(Math.random() * pool.length)];
  const qm = mode === 'mixed' ? (Math.random() < 0.5 ? 'n2s' : 's2n') : mode;
  const same = shuffle(pool.filter(x => x.id !== c.id && x.cat === c.cat));
  const other = shuffle(pool.filter(x => x.id !== c.id && x.cat !== c.cat));
  return { chord: c, qm, opts: shuffle([c, ...[...same, ...other].slice(0, MAX_OPTS - 1)]) };
}

export function ChordQuiz({ chords, showDeg, onComplete, pool, onBack }) {
  const [phase, setPhase] = useState('setup');
  const [mode, setMode] = useState('mixed');
  const [selCats, setSelCats] = useState(() => new Set(Object.keys(CATS)));
  const [qs, setQs] = useState([]);
  const [qi, setQi] = useState(0);
  const [ans, setAns] = useState([]);
  const [picked, setPicked] = useState(null);

  // Only categories the library actually uses are worth offering as filters.
  const usedCats = useMemo(() => Object.keys(CATS).filter(k => (chords || []).some(c => c.cat === k)), [chords]);
  const filteredPool = useMemo(() => {
    if (pool) return pool;
    const fp = chords.filter(c => selCats.has(c.cat));
    return fp.length >= MIN_CHORDS ? fp : chords;
  }, [selCats, pool, chords]);

  const toggleCat = k => setSelCats(prev => { const n = new Set(prev); if (n.has(k)) { if (n.size > 1) n.delete(k); } else n.add(k); return n; });
  const n = Math.min(QL, filteredPool.length);

  const start = () => {
    const arr = []; const seen = new Set();
    for (let i = 0; i < n * 5 && arr.length < n; i++) {
      const q = makeQ(filteredPool, mode);
      if (!seen.has(q.chord.id)) { seen.add(q.chord.id); arr.push(q); }
    }
    setQs(arr); setQi(0); setAns([]); setPicked(null); setPhase('playing');
  };

  const pick = opt => {
    if (picked) return;
    setPicked(opt);
    setTimeout(() => {
      const correct = opt.id === qs[qi].chord.id;
      const na = [...ans, { id: qs[qi].chord.id, correct }];
      setAns(na);
      if (qi + 1 >= qs.length) { onComplete && onComplete(na); setPhase('done'); }
      else { setQi(i => i + 1); setPicked(null); }
    }, 900);
  };

  const score = ans.filter(a => a.correct).length;

  if (phase === 'setup') return (
    <div style={{ padding: '20px 14px', maxWidth: '460px', margin: '0 auto' }}>
      {onBack && <button onClick={onBack} style={{ display: 'block', marginBottom: '12px', background: 'transparent', border: '1px solid #2a2840', color: '#aaa', padding: '5px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>← Back</button>}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '36px', marginBottom: '5px' }}>🎯</div>
        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '0 0 2px', color: '#fff' }}>Chord Quiz</h2>
        <p style={{ color: '#aaa', margin: 0, fontSize: '11px' }}>{pool ? `Drilling ${filteredPool.length} weak chords` : `${n} question${n === 1 ? '' : 's'} from your library`}</p>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', color: '#888', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>Direction</div>
        <div style={{ display: 'flex', gap: '6px' }}>{[{ id: 'n2s', label: 'Name→Shape' }, { id: 's2n', label: 'Shape→Name' }, { id: 'mixed', label: '⚡ Mixed' }].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{ flex: 1, padding: '9px 4px', borderRadius: '9px', cursor: 'pointer', border: mode === m.id ? `2px solid ${ACCENT}` : '1px solid #2a2840', background: mode === m.id ? '#1e1c32' : '#13121f', color: mode === m.id ? ACCENT : '#aaa', fontSize: '11px', fontWeight: 700 }}>{m.label}</button>))}
        </div>
      </div>
      {!pool && usedCats.length > 1 && (<div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', color: '#888', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>Chord types</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{usedCats.map(k => {
          const c = CATS[k], on = selCats.has(k), nc = chords.filter(x => x.cat === k).length;
          return (<button key={k} onClick={() => toggleCat(k)} style={{ padding: '4px 10px', borderRadius: '14px', cursor: 'pointer', fontSize: '10px', fontWeight: 700, border: `1px solid ${on ? c.color : c.color + '33'}`, background: on ? c.color + '22' : 'transparent', color: on ? c.color : '#666' }}>{c.label} ({nc})</button>);
        })}</div>
        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{filteredPool.length} chords in pool</div>
      </div>)}
      <button onClick={start} style={{ display: 'block', width: '100%', background: ACCENT, color: '#111', border: 'none', padding: '13px', borderRadius: '11px', fontSize: '14px', fontWeight: 900, cursor: 'pointer' }}>Start Quiz 🎸</button>
    </div>
  );

  if (phase === 'done') {
    const pct = Math.round(score / qs.length * 100);
    return (<div style={{ padding: '24px 14px', maxWidth: '380px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: '50px', marginBottom: '4px' }}>{pct === 100 ? '🏆' : pct >= 80 ? '⭐' : pct >= 60 ? '🎸' : '💪'}</div>
      <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '2px', color: '#fff' }}>{pct === 100 ? 'Flawless!' : pct >= 80 ? 'Great!' : pct >= 60 ? 'Keep going!' : 'More practice!'}</div>
      <div style={{ fontSize: '54px', fontWeight: 900, color: ACCENT, lineHeight: 1, marginBottom: '2px' }}>{score}/{qs.length}</div>
      <div style={{ color: '#aaa', marginBottom: '14px' }}>{pct}% correct</div>
      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>{ans.map((a, i) => (
        <div key={i} style={{ width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, background: a.correct ? '#00b89420' : '#ff636320', border: `1px solid ${a.correct ? '#00b894' : '#ff6363'}`, color: a.correct ? '#00b894' : '#ff6363' }}>{a.correct ? '✓' : '✗'}</div>))}
      </div>
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
        {onBack && <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #2a2840', color: '#aaa', padding: '8px 14px', borderRadius: '9px', fontSize: '12px', cursor: 'pointer' }}>Back</button>}
        <button onClick={() => setPhase('setup')} style={{ background: 'transparent', border: '1px solid #2a2840', color: '#aaa', padding: '8px 14px', borderRadius: '9px', fontSize: '12px', cursor: 'pointer' }}>Settings</button>
        <button onClick={start} style={{ background: ACCENT, color: '#111', border: 'none', padding: '8px 20px', borderRadius: '9px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>Again</button>
      </div>
    </div>);
  }

  const q = qs[qi]; if (!q) return null;
  const isN2S = q.qm === 'n2s';
  return (<div style={{ padding: '12px', maxWidth: '540px', margin: '0 auto' }}>
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ color: '#999', fontSize: '11px' }}>Q{qi + 1}/{qs.length}</span><span style={{ color: ACCENT, fontSize: '11px', fontWeight: 700 }}>{score} correct</span></div>
      <div style={{ background: '#1a1928', borderRadius: '3px', height: '4px' }}><div style={{ background: `linear-gradient(90deg,#ff6b6b,${ACCENT})`, height: '4px', borderRadius: '3px', width: `${(qi / qs.length) * 100}%`, transition: 'width .3s' }} /></div>
      <span style={{ fontSize: '9px', color: '#666', background: '#1a1928', padding: '1px 7px', borderRadius: '8px', marginTop: '4px', display: 'inline-block' }}>{isN2S ? 'Name → Shape' : 'Shape → Name'}</span>
    </div>
    {isN2S ? (<div>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}><div style={{ fontSize: '10px', color: '#888', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Find the shape for:</div><div style={{ fontSize: '44px', fontWeight: 900, color: ACCENT, lineHeight: 1 }}>{q.chord.sym}</div><div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>{q.chord.name}</div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>{q.opts.map(opt => <ShapeOpt key={opt.id} opt={opt} picked={picked} correctId={q.chord.id} onPick={pick} showDeg={showDeg} hideLabel={true} />)}</div>
    </div>) : (<div>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}><div style={{ fontSize: '10px', color: '#888', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Name this chord:</div><div style={{ background: '#13121f', borderRadius: '12px', padding: '10px', display: 'inline-block', border: '1px solid #2a2840' }}><ChordDiagram v={q.chord.voicings[0]} showDeg={showDeg} size={1.55} /></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>{q.opts.map(opt => <NameOpt key={opt.id} opt={opt} picked={picked} correctId={q.chord.id} onPick={pick} />)}</div>
    </div>)}
  </div>);
}

// ── Scale Degree Quiz ────────────────────────────────────────────────────

const DEG_TIERS = [
  { label: 'Guide Tones ★★★', degs: ['3', 'b3', '7', 'b7'] },
  { label: 'Safe Extensions ★★', degs: ['9', '13', '6', '#11'] },
  { label: 'Tension Tones ⚡', degs: ['b9', '#9', 'b13', 'b5', '#5', 'bb7'] },
  { label: 'Root & Neutral', degs: ['R', '5'] },
  { label: 'Suspended', degs: ['4', '2', '11'] },
];
const DEFAULT_DEGS = new Set(['3', 'b3', '7', 'b7', '9', '13', '6', '#11', 'b9', '#9', 'b13', 'b5', '#5', 'bb7']);
const DEG_TOTAL = 10;

function ScaleDegreeQuiz({ chords, onSaveDeg }) {
  const [phase, setPhase] = useState('intro');
  const [selDegs, setSelDegs] = useState(DEFAULT_DEGS);
  const [chord, setChord] = useState(null);
  const [targetDeg, setTargetDeg] = useState(null);
  const [selIdx, setSelIdx] = useState(-1);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [qi, setQi] = useState(0);
  const [waitNext, setWaitNext] = useState(false);
  const [sessionResults, setSessionResults] = useState([]);

  // Which degrees the library can actually ask about — offering ♭13 when no
  // chord in the library has one would just stall the question picker.
  const availableDegs = useMemo(() => {
    const s = new Set();
    for (const c of chords) for (const d of getCharDegs(c)) s.add(d);
    return s;
  }, [chords]);

  const toggleDeg = d => setSelDegs(prev => { const n = new Set(prev); if (n.has(d)) { if (n.size > 1) n.delete(d); } else n.add(d); return n; });

  const nextQ = useCallback((activeDegSet) => {
    let c, deg, tries = 0;
    do {
      c = shuffle([...chords])[0];
      const av = getCharDegs(c).filter(d => activeDegSet.has(d));
      deg = av.length > 0 ? av[Math.floor(Math.random() * av.length)] : null;
      tries++;
    } while (!deg && tries < 40);
    if (!deg) return false;
    setChord(c); setTargetDeg(deg); setSelIdx(-1); setRevealed(false); setWaitNext(false);
    return true;
  }, [chords]);

  const start = () => { setScore(0); setQi(0); setSessionResults([]); if (nextQ(selDegs)) setPhase('quiz'); };
  const handleNext = () => { const nqi = qi + 1; if (nqi >= DEG_TOTAL) { onSaveDeg && onSaveDeg(sessionResults); setPhase('done'); } else { setQi(nqi); nextQ(selDegs); } };
  const handleDot = idx => {
    if (revealed) return;
    const v = chord.voicings[0]; if (v.str[idx] === -1) return;
    setSelIdx(idx);
    const correct = v.deg?.[idx] === targetDeg;
    const res = { id: chord.id, deg: targetDeg, correct };
    setSessionResults(p => [...p, res]);
    if (correct) {
      setScore(s => s + 1); setRevealed(true);
      setTimeout(() => { const nqi = qi + 1; if (nqi >= DEG_TOTAL) { onSaveDeg && onSaveDeg([...sessionResults, res]); setPhase('done'); } else { setQi(nqi); nextQ(selDegs); } }, 1200);
    } else { setRevealed(true); setWaitNext(true); }
  };

  // A degree can only be asked if some chord in the library carries it.
  const askable = [...selDegs].some(d => availableDegs.has(d));

  if (phase === 'intro') return (
    <div style={{ padding: '18px 16px', maxWidth: '420px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '40px', marginBottom: '6px' }}>🎼</div>
        <h2 style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 8px', color: '#fff' }}>Scale Degree Trainer</h2>
        <p style={{ color: '#ccc', margin: '0', fontSize: '13px', lineHeight: '1.6' }}>Tap the dot matching the asked degree.</p>
      </div>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', color: '#888', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Degrees to practise · <span style={{ color: ACCENT }}>{selDegs.size} selected</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {DEG_TIERS.map(tier => (
            <div key={tier.label} style={{ background: '#13121f', borderRadius: '9px', padding: '9px 10px', border: '1px solid #2a2840' }}>
              <div style={{ fontSize: '10px', color: '#777', marginBottom: '6px', fontWeight: 600 }}>{tier.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {tier.degs.map(d => {
                  const on = selDegs.has(d);
                  const have = availableDegs.has(d);
                  return (
                    <button key={d} onClick={() => toggleDeg(d)} title={have ? undefined : 'No chord in your library has this degree'}
                      style={{ padding: '4px 10px', borderRadius: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: on ? (DC[d] || ACCENT) + '22' : 'transparent', color: on ? (DC[d] || ACCENT) : '#555', border: `1px solid ${on ? (DC[d] || ACCENT) + '66' : '#2a2840'}`, transition: 'all .15s', minHeight: '30px', opacity: have ? 1 : 0.35 }}>{d}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '10px', color: '#666', marginTop: '6px' }}>Dimmed degrees don't appear in any chord you've built yet.</div>
      </div>
      <button onClick={start} disabled={!askable} style={{ display: 'block', width: '100%', background: ACCENT, color: '#111', border: 'none', padding: '14px', borderRadius: '11px', fontSize: '15px', fontWeight: 900, cursor: askable ? 'pointer' : 'not-allowed', opacity: askable ? 1 : 0.4 }}>
        {askable ? 'Start Training 🎼' : 'Select a degree your chords contain'}
      </button>
    </div>
  );

  if (phase === 'done') {
    const pct = Math.round(score / DEG_TOTAL * 100);
    return (<div style={{ padding: '28px 14px', maxWidth: '360px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: '54px', marginBottom: '5px' }}>{pct === 100 ? '🏆' : pct >= 80 ? '⭐' : pct >= 60 ? '🎯' : '💪'}</div>
      <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '3px', color: '#fff' }}>{pct >= 80 ? 'Sharp ears!' : pct >= 60 ? 'Getting there!' : 'Keep practising!'}</div>
      <div style={{ fontSize: '58px', fontWeight: 900, color: ACCENT, lineHeight: 1, marginBottom: '3px' }}>{score}/{DEG_TOTAL}</div>
      <div style={{ color: '#aaa', marginBottom: '18px' }}>{pct}% correct</div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <button onClick={() => setPhase('intro')} style={{ background: 'transparent', border: '1px solid #2a2840', color: '#aaa', padding: '10px 20px', borderRadius: '9px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Settings</button>
        <button onClick={start} style={{ background: ACCENT, color: '#111', border: 'none', padding: '10px 28px', borderRadius: '9px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>Again</button>
      </div>
    </div>);
  }

  if (!chord || !targetDeg) return null;
  const v = chord.voicings[0];
  const isCorrect = revealed && (v.deg || []).some((d, i) => d === targetDeg && i === selIdx);
  return (
    <div style={{ padding: '12px', maxWidth: '420px', margin: '0 auto' }}>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ color: '#999', fontSize: '11px' }}>Q{qi + 1}/{DEG_TOTAL}</span><span style={{ color: ACCENT, fontSize: '11px', fontWeight: 700 }}>{score} correct</span></div>
        <div style={{ background: '#1a1928', borderRadius: '3px', height: '4px' }}><div style={{ background: `linear-gradient(90deg,#ff6b6b,${ACCENT})`, height: '4px', borderRadius: '3px', width: `${(qi / DEG_TOTAL) * 100}%`, transition: 'width .3s' }} /></div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>{chord.name}</div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '5px', fontSize: '12px' }}>
          <span><span style={{ color: '#ff4757', fontWeight: 700 }}>●</span> <span style={{ color: '#aaa' }}>Root</span></span>
          <span><span style={{ color: '#ffd93d', fontWeight: 700 }}>●</span> <span style={{ color: '#aaa' }}>Note</span></span>
          {revealed && <><span><span style={{ color: '#00b894', fontWeight: 700 }}>●</span> <span style={{ color: '#aaa' }}>Correct</span></span><span><span style={{ color: '#ff6363', fontWeight: 700 }}>●</span> <span style={{ color: '#aaa' }}>Wrong</span></span></>}
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '12px', padding: '9px', background: '#13121f', borderRadius: '10px', border: `1px solid ${DC[targetDeg] || ACCENT}44` }}>
        <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '3px' }}>Tap the</div>
        <div style={{ fontSize: '30px', fontWeight: 900, color: DC[targetDeg] || ACCENT }}>{targetDeg}</div>
        {revealed && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px', fontStyle: 'italic' }}>{DEG_HINT[targetDeg] || ''}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
        <div style={{ background: '#13121f', borderRadius: '14px', padding: '14px', border: `1px solid ${!revealed ? '#2a2840' : isCorrect ? '#00b894' : '#ff6363'}`, transition: 'border-color .3s' }}>
          <ClickableDiagram v={v} onDotClick={!revealed ? handleDot : null} selIdx={selIdx} revealed={revealed} targetDeg={targetDeg} size={1.9} />
        </div>
      </div>
      {revealed && <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: isCorrect ? '#00b894' : '#ff6363', marginBottom: '8px' }}>{isCorrect ? '✓ Correct!' : '✗ Not quite — degrees revealed above'}</div>
        {waitNext && <button onClick={handleNext} style={{ background: ACCENT, color: '#111', border: 'none', padding: '11px 36px', borderRadius: '10px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', minHeight: '44px' }}>Next →</button>}
      </div>}
    </div>
  );
}

// ── Tab ──────────────────────────────────────────────────────────────────

export default function QuizTab({ chords, showDeg, onChordQuizDone, onDegDone, onGoBuild }) {
  const [mode, setMode] = useState('chord');

  if (chords.length < MIN_CHORDS) {
    return <EmptyState icon="🎯" title="Not enough chords to quiz yet"
      body={`A quiz needs ${MIN_CHORDS} chords so there's something to choose between. You have ${chords.length} — add ${MIN_CHORDS - chords.length} more and this unlocks.`}
      action="Build a chord" onAction={onGoBuild} />;
  }

  return (<div>
    <div style={{ display: 'flex', gap: '0', margin: '8px 12px 0', background: '#13121f', borderRadius: '10px', padding: '3px', border: '1px solid #2a2840' }}>
      {[{ id: 'chord', label: '🎸 Chord Quiz' }, { id: 'degree', label: '🎼 Scale Degrees' }].map(m => (
        <button key={m.id} onClick={() => setMode(m.id)} style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', cursor: 'pointer', border: 'none', background: mode === m.id ? '#2a2840' : 'transparent', color: mode === m.id ? ACCENT : '#888', fontSize: '12px', fontWeight: 700, transition: 'all .15s' }}>{m.label}</button>))}
    </div>
    {mode === 'chord' && <ChordQuiz chords={chords} showDeg={showDeg} onComplete={onChordQuizDone} />}
    {mode === 'degree' && <ScaleDegreeQuiz chords={chords} onSaveDeg={onDegDone} />}
  </div>);
}
