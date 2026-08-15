import { DC } from '../data/theory.js';

// The Build tab's shape input: a chord box you edit by tapping it.
//
// It replaced six rows of sixteen fret buttons. Those rows worked, but they
// pushed the live preview so far up the page that you could not see the shape
// you were building without scrolling back — on a phone the diagram and the
// controls for it were never on screen together. Here the diagram *is* the
// control, so that gap cannot reopen.
//
// Geometry follows ChordDiagram (low E on the left, frets running top→bottom,
// per the toolbox's portrait-diagram convention) but at a larger string
// spacing, because every cell here is a thumb target rather than a dot to look
// at. At the default 360px cap a cell is ~53×69 CSS px, comfortably past the
// 44px minimum.
//
// IMPORTANT: App.jsx sets `svg{pointer-events:none}` globally and re-enables it
// only for elements carrying an inline `cursor` style. React's onClick attaches
// through delegation and does *not* emit an `onclick` attribute, so the other
// half of that rule never matches a React handler. Every tappable node below
// therefore needs its own inline `cursor` — without it the tap silently does
// nothing. Purely decorative nodes deliberately omit it and stay inert.

export const FRET_WINDOW = 6; // frets visible at once
export const MAX_FRET = 14;
export const MAX_WIN_START = MAX_FRET - FRET_WINDOW + 1;

const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];

// Dots are labelled with the NOTE they sound, not the scale degree. Degrees
// are undefined until a root is marked, which is exactly the stretch when you
// are placing notes and most want to know what you just fretted. The degree is
// still what drives the dot's COLOUR, so the root keeps reading as red the
// moment it is marked, and it is still what gets derived, validated and saved —
// it just is not the label any more. Where a degree is genuinely ambiguous the
// spelling dropdown below the board is where it surfaces.
export default function EditableFretboard({
  str, deg, notes, rootIdx, winStart,
  onCell, onMarker, onRoot,
  maxWidth = 360,
}) {
  // LM has to clear the widest left-gutter text, which is the word "root" on
  // the root row, not the two-digit fret numbers — at 24 it clipped.
  const LM = 32, SS = 20, GW = SS * 5, RM = 16;
  const W = LM + GW + RM;
  const LABEL_Y = 9, MARK_Y = 24, TOP = 34, FS = 23;
  const gridH = FRET_WINDOW * FS;
  const ROOT_Y = TOP + gridH + 22;
  const H = ROOT_Y + 15;

  const x = i => LM + i * SS;
  const lineY = k => TOP + k * FS;
  const cellCy = f => TOP + (f - winStart + 0.5) * FS;
  const winEnd = winStart + FRET_WINDOW - 1;

  const cells = [];   // tap targets, drawn under everything
  const marks = [];   // dots, ✕/○ markers, ghosts
  const roots = [];   // the R row

  for (let i = 0; i < 6; i++) {
    const fret = str[i];
    const d = deg?.[i];          // drives colour, and the saved label
    const n = notes?.[i];        // drives the text on the dot
    const isRoot = rootIdx === i;
    const muted = fret < 0;

    // ── Fret cells ────────────────────────────────────────────────────────
    for (let k = 0; k < FRET_WINDOW; k++) {
      const f = winStart + k;
      cells.push(
        <rect key={`c${i}-${k}`} x={x(i) - SS / 2} y={lineY(k)} width={SS} height={FS}
          fill="transparent" style={{ cursor: 'pointer' }}
          onClick={() => onCell(i, f)} />
      );
    }

    // ── Mute / open marker above the nut ──────────────────────────────────
    marks.push(
      <g key={`m${i}`} style={{ cursor: 'pointer' }} onClick={() => onMarker(i)}>
        <circle cx={x(i)} cy={MARK_Y} r={9} fill="transparent" />
        {muted ? (
          <g>
            <line x1={x(i) - 3.6} y1={MARK_Y - 3.6} x2={x(i) + 3.6} y2={MARK_Y + 3.6} stroke="#e74c3c" strokeWidth={1.9} strokeLinecap="round" />
            <line x1={x(i) + 3.6} y1={MARK_Y - 3.6} x2={x(i) - 3.6} y2={MARK_Y + 3.6} stroke="#e74c3c" strokeWidth={1.9} strokeLinecap="round" />
          </g>
        ) : fret === 0 ? (
          <g>
            <circle cx={x(i)} cy={MARK_Y} r={5.6} fill={d ? (DC[d] || '#74b9ff') : '#1b1a2a'} stroke={d ? (DC[d] || '#74b9ff') : '#74b9ff'} strokeWidth={1.6} />
            {n && <text x={x(i)} y={MARK_Y} textAnchor="middle" dominantBaseline="central" fontSize={n.length > 1 ? 4.8 : 6} fill={d ? '#111' : '#9fd3ff'} fontWeight="bold" fontFamily="sans-serif">{n}</text>}
          </g>
        ) : (
          // Fretted: a hollow hint that this marker is still the way to open
          // or mute the string.
          <circle cx={x(i)} cy={MARK_Y} r={4.4} fill="none" stroke="#3a3852" strokeWidth={1.5} />
        )}
      </g>
    );

    // ── The fretted note ──────────────────────────────────────────────────
    if (fret > 0) {
      const fill = d ? (DC[d] || '#ffd93d') : (isRoot ? '#ff4757' : '#ffd93d');
      if (fret >= winStart && fret <= winEnd) {
        marks.push(
          <g key={`d${i}`}>
            <circle cx={x(i)} cy={cellCy(fret)} r={7.4} fill={fill} />
            {n && <text x={x(i)} y={cellCy(fret)} textAnchor="middle" dominantBaseline="central" fontSize={n.length > 1 ? 6.2 : 7.6} fill="#111" fontWeight="bold" fontFamily="sans-serif">{n}</text>}
          </g>
        );
      } else {
        // Out of view: a dashed ghost pinned to the edge it lies beyond,
        // labelled with its real fret so the shape is never silently
        // incomplete. Inert by design — the window arrows move the view.
        const above = fret < winStart;
        const gy = above ? lineY(0) + FS * 0.5 : lineY(FRET_WINDOW) - FS * 0.5;
        marks.push(
          <g key={`g${i}`} opacity={0.55}>
            <circle cx={x(i)} cy={gy} r={7.4} fill="none" stroke={fill} strokeWidth={1.6} strokeDasharray="2.5 2" />
            <text x={x(i)} y={gy} textAnchor="middle" dominantBaseline="central" fontSize={7} fill={fill} fontWeight="bold" fontFamily="monospace">{fret}</text>
            <text x={x(i)} y={above ? gy - 10.5 : gy + 11} textAnchor="middle" dominantBaseline="central" fontSize={6} fill={fill} fontFamily="sans-serif">{above ? '▲' : '▼'}</text>
          </g>
        );
      }
    }

    // ── Root row ──────────────────────────────────────────────────────────
    roots.push(
      <g key={`r${i}`} style={{ cursor: muted ? 'default' : 'pointer' }}
        onClick={() => { if (!muted) onRoot(i); }} opacity={muted ? 0.25 : 1}>
        <circle cx={x(i)} cy={ROOT_Y} r={10} fill="transparent" />
        <circle cx={x(i)} cy={ROOT_Y} r={7.4} fill={isRoot ? '#ff4757' : 'none'} stroke={isRoot ? '#ff4757' : '#3a3852'} strokeWidth={1.6} />
        <text x={x(i)} y={ROOT_Y} textAnchor="middle" dominantBaseline="central" fontSize={7.4} fill={isRoot ? '#111' : '#6b6980'} fontWeight="bold" fontFamily="sans-serif">R</text>
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{
      display: 'block', margin: '0 auto', width: '100%', maxWidth: `${maxWidth}px`, height: 'auto',
      touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
    }}>
      {/* String names */}
      {STRING_LABELS.map((s, i) => (
        <text key={s + i} x={x(i)} y={LABEL_Y} textAnchor="middle" dominantBaseline="central" fontSize={7} fill="#8a88a0" fontWeight="bold" fontFamily="sans-serif">{s}</text>
      ))}

      {/* Tap targets sit under the grid so the lines and dots read cleanly */}
      {cells}

      {/* Fret lines — the top one is the nut only when the window starts at 1 */}
      {Array.from({ length: FRET_WINDOW + 1 }, (_, k) => (
        <line key={k} x1={LM - SS / 2} y1={lineY(k)} x2={LM + GW + SS / 2} y2={lineY(k)}
          stroke={k === 0 && winStart === 1 ? '#bbb' : '#2a2840'}
          strokeWidth={k === 0 && winStart === 1 ? 3 : 1.5} />
      ))}
      {/* Strings */}
      {[0, 1, 2, 3, 4, 5].map(i => (
        <line key={i} x1={x(i)} y1={lineY(0)} x2={x(i)} y2={lineY(FRET_WINDOW)} stroke="#2a2840" strokeWidth={1.5} />
      ))}
      {/* Fret numbers down the left gutter */}
      {Array.from({ length: FRET_WINDOW }, (_, k) => (
        <text key={k} x={LM - SS / 2 - 4} y={lineY(k) + FS / 2} textAnchor="end" dominantBaseline="central"
          fontSize={7} fill="#5a5872" fontFamily="monospace">{winStart + k}</text>
      ))}

      {marks}

      <text x={LM - SS / 2 - 4} y={ROOT_Y} textAnchor="end" dominantBaseline="central" fontSize={6.5} fill="#5a5872" fontFamily="sans-serif">root</text>
      {roots}
    </svg>
  );
}
