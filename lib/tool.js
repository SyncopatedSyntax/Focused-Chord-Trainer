// Local mirror of this app's entry in the Fretworks tool registry
// (@fretworks/design → src/tools.js). AppHeader and TabBar resolve a tool's
// name and accent through toolByKey() only, so until the registry PR lands
// this descriptor is what FocusHeader falls back to — and once it lands the
// two agree and the fallback stops being used. Keep them in sync.
export const TOOL = {
  key: 'focus',
  name: 'Focused Chord Trainer',
  emoji: '🎯',
  accent: '#4ecdc4',
  path: '/focus/',
};

export const ACCENT = TOOL.accent;
