import { useState, useEffect } from 'react';

// Phone-width check for the few places that need a different layout rather
// than a smaller one. The app styles inline, so there is no stylesheet to hang
// a media query off — this reads the same query through matchMedia instead.
//
// 720px is where the Build tab's two-column layout stops fitting: the chord
// list has a 240px floor and the editor beside it needs roughly 400px.
export function useIsNarrow(px = 720) {
  const query = `(max-width: ${px}px)`;
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = e => setNarrow(e.matches);
    setNarrow(mq.matches); // resync in case it changed before this ran
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return narrow;
}
