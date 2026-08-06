import { DC } from '../data/theory.js';

// Fretboard diagram whose dots are tappable — the Scale Degree quiz's answer
// surface. Same geometry as ChordDiagram, plus per-dot selection/correct/wrong
// states and an oversized transparent hit circle so the target is thumb-sized.
// Lifted from Chord Trainer's App.jsx.
export default function ClickableDiagram({ v, onDotClick, selIdx, revealed, targetDeg, size }) {
  const sc = size || 2; if (!v) return null;
  const { str, deg, sf } = v;
  const active = str.filter(f => f > 0), maxF = active.length > 0 ? Math.max(...active) : sf, nFrets = Math.max(5, maxF - sf + 1);
  const ML = 12, GW = 64, RPAD = 46, MT = 30, MB = 6, FS = 21;
  const W = ML + GW + RPAD, H = MT + nFrets * FS + MB, SS = GW / 5, DR = 5.2;
  const sx = i => ML + i * SS, fy = f => MT + (f - sf + 0.5) * FS;
  const dots = [];
  for (let i = 0; i < str.length; i++) {
    const fret = str[i], x = sx(i), d = deg?.[i], isR = d === 'R';
    if (fret === -1) { const y = MT - 14, s = 3.5; dots.push(<g key={i}><line x1={x - s} y1={y - s} x2={x + s} y2={y + s} stroke="#e74c3c" strokeWidth={1.9} strokeLinecap="round" /><line x1={x + s} y1={y - s} x2={x - s} y2={y + s} stroke="#e74c3c" strokeWidth={1.9} strokeLinecap="round" /></g>); }
    else if (fret === 0) {
      const cy = MT - 14, isSel = selIdx === i, isC = revealed && d === targetDeg, isW = revealed && isSel && !isC;
      const fill = revealed ? (isC ? '#00b894' : isW ? '#ff6363' : (d ? (DC[d] || '#74b9ff') : (isR ? '#ff4757' : 'none'))) : (isSel ? '#a29bfe' : (isR ? '#ff4757' : 'none'));
      const strokeC = revealed ? (isC ? '#00b894' : isW ? '#ff6363' : (d ? (DC[d] || '#74b9ff') : '#74b9ff')) : (isSel ? '#a29bfe' : isR ? '#ff4757' : '#74b9ff');
      const tFill = fill === 'none' ? '#74b9ff' : '#111';
      dots.push(<g key={i} onClick={() => onDotClick && onDotClick(i)} style={{ cursor: onDotClick ? 'pointer' : 'default' }}>
        <circle cx={x} cy={cy} r={DR * 2.8} fill="transparent" />
        <circle cx={x} cy={cy} r={4.25} fill={fill} stroke={strokeC} strokeWidth={(isC || isSel) ? 2.5 : 1.9} />
        {revealed && d && <text x={x} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={d.length > 2 ? 5 : d.length > 1 ? 6 : 7} fill={tFill} fontWeight="bold" fontFamily="sans-serif">{d}</text>}
      </g>);
    } else {
      const cy = fy(fret), isSel = selIdx === i, isC = revealed && d === targetDeg, isW = revealed && isSel && !isC;
      let fill = isR ? '#ff4757' : '#ffd93d';
      if (revealed) { fill = DC[d] || '#ffd93d'; if (isC) fill = '#00b894'; if (isW) fill = '#ff6363'; }
      else if (isSel) fill = '#a29bfe';
      dots.push(<g key={i} onClick={() => onDotClick && onDotClick(i)} style={{ cursor: onDotClick ? 'pointer' : 'default' }}>
        <circle cx={x} cy={cy} r={DR * 2.8} fill="transparent" />
        <circle cx={x} cy={cy} r={DR} fill={fill} />
        {revealed && d && <text x={x} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={d.length > 2 ? 5 : d.length > 1 ? 6 : 7} fill={isC || isW ? '#fff' : '#111'} fontWeight="bold" fontFamily="sans-serif">{d}</text>}
      </g>);
    }
  }
  return (<svg viewBox={`0 0 ${W} ${H}`} width={W * sc} height={H * sc} style={{ display: 'block', touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none' }}>
    {Array.from({ length: nFrets + 1 }, (_, j) => <line key={j} x1={ML} y1={MT + j * FS} x2={ML + GW} y2={MT + j * FS} stroke={j === 0 && sf === 1 ? '#bbb' : '#2a2840'} strokeWidth={j === 0 && sf === 1 ? 3 : 1.5} />)}
    {[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1={sx(i)} y1={MT} x2={sx(i)} y2={MT + nFrets * FS} stroke="#2a2840" strokeWidth={1.5} />)}
    {sf > 1 && <text x={ML + GW + 10} y={MT + FS * 0.68} fontSize={10} fill="#bbb" fontFamily="monospace" textAnchor="start">{sf}fr</text>}
    {dots}
  </svg>);
}
