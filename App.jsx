import { useState, useEffect, useCallback, useRef } from 'react';
import { TabBar } from '@fretworks/design';
import FocusHeader from './components/FocusHeader.jsx';
import AudioHintPanel from './components/AudioHintPanel.jsx';
import { useChords } from './lib/ChordsContext.jsx';
import { PREFIX } from './lib/library.js';
import { updateSRS, todayStr } from './lib/srs.js';
import { registerFirstPlay, firstPlayFired } from './lib/audio.js';
import { ACCENT } from './lib/tool.js';
import TodayTab from './tabs/TodayTab.jsx';
import LibraryTab from './tabs/LibraryTab.jsx';
import BuildTab from './tabs/BuildTab.jsx';
import QuizTab from './tabs/QuizTab.jsx';
import WeakTab from './tabs/WeakTab.jsx';
import SettingsTab from './tabs/SettingsTab.jsx';

// Practice state keys. The chord library uses the same `fct_` prefix (see
// lib/library.js), which is what lets one ProgressBackup file carry both.
const K_SRS = PREFIX + 'srs';
const K_HIST = PREFIX + 'hist';
const K_DEGH = PREFIX + 'degh';
const K_MASTERED = PREFIX + 'mastered';
const K_LAUNCHES = PREFIX + 'launches';
const K_HINT10 = PREFIX + 'audio_hint_launch';
const K_HINT20 = PREFIX + 'audio_hint_launch20';

const read = (k, fallback) => { try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

const TABS = [
  { id: 'daily', label: 'Today', icon: '🌅' },
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'build', label: 'Build', icon: '✏️' },
  { id: 'quiz', label: 'Quiz', icon: '🎯' },
  { id: 'weak', label: 'Weak', icon: '💪' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const { chords, loaded: chordsLoaded, dropped } = useChords();
  const [tab, setTab] = useState('daily');
  const [showDeg, setShowDeg] = useState(false);
  const [srs, setSrs] = useState({});
  const [hist, setHist] = useState([]);
  const [degHist, setDegHist] = useState([]);
  const [mastered, setMastered] = useState(() => new Set());
  const [showAudioHint, setShowAudioHint] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [hidDropped, setHidDropped] = useState(false);

  const scrollRef = useRef(null);
  // Refs so the async callbacks below always see fresh values without taking
  // them as dependencies — that keeps the callbacks stable, which is what lets
  // TodayTab stay memo'd across a grade.
  const srsRef = useRef(srs); srsRef.current = srs;
  const histRef = useRef(hist); histRef.current = hist;
  const degHistRef = useRef(degHist); degHistRef.current = degHist;
  const masteredRef = useRef(mastered); masteredRef.current = mastered;

  // ── Load practice state ────────────────────────────────────────────────
  useEffect(() => {
    setSrs(read(K_SRS, {}));
    setHist(read(K_HIST, []));
    setDegHist(read(K_DEGH, []));
    setMastered(new Set(read(K_MASTERED, [])));
    setLoaded(true);
  }, []);

  // ── Launch counter (drives how long a dismissed audio hint stays away) ──
  useEffect(() => {
    const n = read(K_LAUNCHES, 0);
    write(K_LAUNCHES, n + 1);
  }, []);

  // ── Audio hint: old iOS only ───────────────────────────────────────────
  // Registering here (rather than inside a fixed-position component) means the
  // callback triggers an ordinary in-tree state update — no coordinate or paint
  // issues. On iOS 16.4+, audioSession 'playback' already bypasses the silent
  // switch, so "unmute your ringtone" would be wrong advice.
  useEffect(() => {
    if (!/iphone|ipad|ipod/i.test(navigator.userAgent)) return;
    if (navigator.audioSession) return;
    const launches = read(K_LAUNCHES, 0);
    const sup10 = read(K_HINT10, 0);
    const sup20 = read(K_HINT20, 0);
    if (Math.max(sup10, sup20) >= launches) return;
    if (firstPlayFired()) { setShowAudioHint(true); return; }
    registerFirstPlay(() => setShowAudioHint(true));
    return () => registerFirstPlay(null);
  }, []);

  // ── Page chrome ────────────────────────────────────────────────────────
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
      html,body{height:100%;overflow:hidden;background:#0f0e17;}
      button,a,label,[role=button]{touch-action:manipulation;-webkit-user-select:none;user-select:none;}
      input,textarea,select{font-size:16px!important;}
      svg{user-select:none;-webkit-user-select:none;pointer-events:none;}
      svg [onclick],svg [style*='cursor']{pointer-events:auto;}
      :root{--sat:env(safe-area-inset-top);--sab:env(safe-area-inset-bottom);}
      @keyframes fct-spin{to{transform:rotate(360deg);}}
      .fct-spin{display:inline-block;animation:fct-spin .8s linear infinite;}
      /* Build tab's per-string fret picker scrolls sideways on phones; the
         scrollbar would eat a row of its already-tight height. WebKit only
         honours this as a real rule, not an inline style. */
      .fct-fretstrip::-webkit-scrollbar{display:none;}
    `;
    document.head.appendChild(style);

    const setMeta = (name, content) => { let m = document.querySelector(`meta[name="${name}"]`); if (!m) { m = document.createElement('meta'); m.name = name; document.head.appendChild(m); } m.content = content; };
    setMeta('theme-color', '#0f0e17');
    setMeta('viewport', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
    setMeta('apple-mobile-web-app-capable', 'yes');
    setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    setMeta('apple-mobile-web-app-title', 'Fretworks');

    // Single PWA: reference the unified shell manifest (one manifest per origin)
    // rather than generating a competing per-app one.
    let mlink = document.querySelector('link[rel="manifest"]');
    if (!mlink) { mlink = document.createElement('link'); mlink.rel = 'manifest'; document.head.appendChild(mlink); }
    mlink.href = '/manifest.webmanifest';

    // ── iOS standalone scroll offset fix ─────────────────────────────────
    // In standalone PWA mode WebKit initialises window.scrollY to the
    // safe-area-inset-top value (~50px). Touch events fire at layout coords
    // while the screen renders the visual viewport scrolled down, so every tap
    // registers ~50px above where it visually appears. Pin the page at 0,0.
    window.scrollTo(0, 0);
    const lockScroll = () => { if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0); };
    window.addEventListener('scroll', lockScroll, { passive: true });

    return () => { document.head.removeChild(style); window.removeEventListener('scroll', lockScroll); };
  }, []);

  // ── Persistence helpers ────────────────────────────────────────────────
  const saveSrs = d => { setSrs(d); write(K_SRS, d); };
  const saveHist = d => { setHist(d); write(K_HIST, d); };
  const saveDegHist = d => { setDegHist(d); write(K_DEGH, d); };
  const saveMastered = s => { setMastered(s); write(K_MASTERED, [...s]); };

  const onToggleMastered = useCallback(id => {
    const s = new Set(masteredRef.current);
    if (s.has(id)) s.delete(id); else s.add(id);
    saveMastered(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChordQuizDone = useCallback(results => {
    const ns = { ...srsRef.current }, nh = [...histRef.current], td = todayStr();
    for (const r of results) { ns[r.id] = updateSRS(ns[r.id], r.correct); nh.push({ id: r.id, correct: r.correct, date: td }); }
    saveSrs(ns); saveHist(nh);
  }, []); // eslint-disable-line

  const onDegDone = useCallback(results => {
    saveDegHist([...degHistRef.current, ...results.map(r => ({ ...r, date: todayStr() }))]);
  }, []); // eslint-disable-line

  // Stable — reads fresh state through refs, so TodayTab's memo holds and the
  // card list doesn't reshuffle when a grade lands.
  const onMarkReviewed = useCallback(id => {
    saveSrs({ ...srsRef.current, [id]: updateSRS(srsRef.current[id], true) });
    saveHist([...histRef.current, { id, correct: true, date: todayStr() }]);
  }, []); // eslint-disable-line

  // Navigating away from Build discards the pending edit target, so coming back
  // later opens a fresh editor rather than reopening whatever was last edited.
  const goTab = id => { setTab(id); if (id !== 'build') setEditTarget(null); if (scrollRef.current) scrollRef.current.scrollTop = 0; };
  const goBuild = () => goTab('build');
  const editChord = chord => { setEditTarget(chord); goTab('build'); };

  if (!loaded || !chordsLoaded) return (
    <div style={{ background: '#0f0e17', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT, fontSize: '16px' }}>Loading…</div>
  );

  return (
    <div style={{ background: '#0f0e17', height: '100dvh', display: 'flex', flexDirection: 'column', color: '#fffffe', fontFamily: 'var(--font-body)', WebkitFontSmoothing: 'antialiased' }}>
      <FocusHeader>
        <button className={`fw-header-btn${showDeg ? ' is-on' : ''}`} onClick={() => setShowDeg(p => !p)}>
          {showDeg ? '✦ Degrees ON' : 'Scale Degrees'}
        </button>
      </FocusHeader>

      <TabBar toolKey="focus" accent={ACCENT} tabs={TABS} active={tab} onChange={goTab} />

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'none' }}>
        <div style={{ paddingBottom: 'max(32px,env(safe-area-inset-bottom))' }}>
          {dropped > 0 && !hidDropped && (
            <div style={{ margin: '12px', padding: '9px 12px', background: '#ff636318', border: '1px solid #ff636344', borderRadius: '9px', fontSize: '11px', color: '#ffb3b3', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ flex: 1 }}>{dropped} saved chord{dropped === 1 ? '' : 's'} failed validation and {dropped === 1 ? 'was' : 'were'} skipped. Restore from a backup in Settings if that looks wrong.</span>
              <button onClick={() => setHidDropped(true)} aria-label="Dismiss"
                style={{ background: 'transparent', border: 'none', color: '#ffb3b3', fontSize: '16px', cursor: 'pointer', lineHeight: 1, padding: '0 4px', minHeight: '28px', flexShrink: 0 }}>×</button>
            </div>
          )}
          {tab === 'daily' && <TodayTab chords={chords} srsData={srs} showDeg={showDeg} setShowDeg={setShowDeg} onMarkReviewed={onMarkReviewed} mastered={mastered} onToggleMastered={onToggleMastered} scrollRef={scrollRef} onGoBuild={goBuild} />}
          {tab === 'library' && <LibraryTab chords={chords} showDeg={showDeg} setShowDeg={setShowDeg} mastered={mastered} onToggleMastered={onToggleMastered} scrollRef={scrollRef} onGoBuild={goBuild} onEditChord={editChord} />}
          {tab === 'build' && <BuildTab key={editTarget ? editTarget.id : 'new'} editTarget={editTarget} />}
          {tab === 'quiz' && <QuizTab chords={chords} showDeg={showDeg} onChordQuizDone={onChordQuizDone} onDegDone={onDegDone} onGoBuild={goBuild} />}
          {tab === 'weak' && <WeakTab chords={chords} history={hist} degHist={degHist} srs={srs} showDeg={showDeg} onComplete={onChordQuizDone} onGoBuild={goBuild} />}
          {tab === 'settings' && <SettingsTab chords={chords} srs={srs} hist={hist} degHist={degHist} />}

          {showAudioHint && (
            <AudioHintPanel
              onDismiss10={() => { setShowAudioHint(false); write(K_HINT10, read(K_LAUNCHES, 0) + 10); }}
              onDismiss20={() => { setShowAudioHint(false); write(K_HINT20, read(K_LAUNCHES, 0) + 20); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
