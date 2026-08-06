import { DC } from '../data/theory.js';

// Presentational fretboard diagram. `v` = {str, deg, sf}. Shared by the trainer
// and the chord editor so both render identically.
export default function ChordDiagram({ v, showDeg, size }) {
  const sc = size || 1; if (!v) return null;
  const { str, deg, sf } = v;
  const active = str.filter(f => f > 0);
  const maxF = active.length > 0 ? Math.max(...active) : sf;
  const nFrets = Math.max(5, maxF - sf + 1);
  const ML = 12, GW = 64, RPAD = 46, MT = 30, MB = 6, FS = 21;
  const W = ML + GW + RPAD, H = MT + nFrets * FS + MB, SS = GW / 5, DR = 5.2;
  const sx = i => ML + i * SS, fy = f => MT + (f - sf + 0.5) * FS;
  const dots = [];
  for (let i = 0; i < str.length; i++) {
    const fret = str[i], x = sx(i), d = deg?.[i], isR = d === 'R';
    if (fret === -1) { const y = MT - 14, s = 3.5; dots.push(<g key={i}><line x1={x - s} y1={y - s} x2={x + s} y2={y + s} stroke="#e74c3c" strokeWidth={1.9} strokeLinecap="round" /><line x1={x + s} y1={y - s} x2={x - s} y2={y + s} stroke="#e74c3c" strokeWidth={1.9} strokeLinecap="round" /></g>); }
    else if (fret === 0) {
      const cy = MT - 14, fill = showDeg && d ? (DC[d] || '#74b9ff') : (isR ? '#ff4757' : 'none'), strokeC = showDeg && d ? (DC[d] || '#74b9ff') : (isR ? '#ff4757' : '#74b9ff'), tFill = fill === 'none' ? '#74b9ff' : '#111';
      dots.push(<g key={i}><circle cx={x} cy={cy} r={4.25} fill={fill} stroke={strokeC} strokeWidth={1.9} />{d && showDeg && <text x={x} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={d.length > 2 ? 5 : d.length > 1 ? 6 : 7} fill={tFill} fontWeight="bold" fontFamily="sans-serif">{d}</text>}</g>);
    } else {
      const cy = fy(fret), fill = showDeg && d ? (DC[d] || '#ffd93d') : (isR ? '#ff4757' : '#ffd93d');
      dots.push(<g key={i}><circle cx={x} cy={cy} r={DR} fill={fill} />{d && showDeg && <text x={x} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={d.length > 2 ? 5 : d.length > 1 ? 6 : 7} fill="#111" fontWeight="bold" fontFamily="sans-serif">{d}</text>}</g>);
    }
  }
  return (<svg viewBox={`0 0 ${W} ${H}`} width={W * sc} height={H * sc} style={{ display: 'block', userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation' }}>
    {Array.from({ length: nFrets + 1 }, (_, j) => <line key={j} x1={ML} y1={MT + j * FS} x2={ML + GW} y2={MT + j * FS} stroke={j === 0 && sf === 1 ? '#bbb' : '#2a2840'} strokeWidth={j === 0 && sf === 1 ? 3 : 1.5} />)}
    {[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1={sx(i)} y1={MT} x2={sx(i)} y2={MT + nFrets * FS} stroke="#2a2840" strokeWidth={1.5} />)}
    {sf > 1 && <text x={ML + GW + 10} y={MT + FS * 0.68} fontSize={10} fill="#bbb" fontFamily="monospace" textAnchor="start">{sf}fr</text>}
    {dots}
  </svg>);
}
