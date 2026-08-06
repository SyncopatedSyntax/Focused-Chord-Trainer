// The seam that replaces Chord Trainer's module-level
// `import CHORDS from './data/chords.json'`. Everything that needs the chord
// list — Today, Library, Quiz, Weak, Build — reads it from here, so a chord
// added in the Build tab is visible everywhere on the next render.

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as lib from './library.js';

const Ctx = createContext(null);

export function ChordsProvider({ children }) {
  const [chords, setChords] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [dropped, setDropped] = useState(0);

  useEffect(() => {
    const r = lib.loadChords();
    setChords(r.chords);
    setDropped(r.dropped);
    setLoaded(true);
  }, []);

  // One helper so every mutation persists exactly once, and state and storage
  // can never disagree.
  const commit = useCallback(next => {
    setChords(next);
    lib.saveChords(next);
    return next;
  }, []);

  const value = useMemo(() => ({
    chords,
    loaded,
    dropped,
    add: chord => commit(lib.addChord(chords, chord)),
    update: (id, chord) => commit(lib.updateChord(chords, id, chord)),
    remove: id => commit(lib.removeChord(chords, id)),
    replaceAll: list => commit(list),
    merge: incoming => {
      const { chords: next, renamed } = lib.mergeChords(chords, incoming);
      commit(next);
      return renamed;
    },
  }), [chords, loaded, dropped, commit]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChords() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useChords must be used inside <ChordsProvider>');
  return v;
}
