export type Theme = 'bright' | 'dark';

export const THEME_STORAGE_KEY = 'easyeng-theme';

// Module-level store so the theme can be read/toggled anywhere WITHOUT a React
// context provider wrapping the tree. (Wrapping the RSC page tree in a new
// client boundary breaks RSC serialization in this workspace, so we avoid it.)
// Read the theme the pre-hydration script already applied to <html> (or the
// persisted choice), so the store agrees with the DOM without a separate
// initializer component in the server layout.
function detectInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'bright') return attr;
  }
  if (typeof window !== 'undefined') {
    try {
      if (localStorage.getItem(THEME_STORAGE_KEY) === 'dark') return 'dark';
    } catch (_) {
      /* ignore */
    }
  }
  return 'bright';
}

let currentTheme: Theme = detectInitialTheme();
let initialized = typeof document !== 'undefined';
const listeners = new Set<() => void>();

function applyToDocument(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function getTheme(): Theme {
  // Lazily adopt the DOM/persisted theme the first time we read on the client.
  if (!initialized && typeof document !== 'undefined') {
    currentTheme = detectInitialTheme();
    initialized = true;
  }
  return currentTheme;
}

// Server snapshot: the SSR HTML always renders data-theme="bright".
export function getServerTheme(): Theme {
  return 'bright';
}

export function setTheme(theme: Theme) {
  currentTheme = theme;
  applyToDocument(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (_) {
    /* storage unavailable — theme still applies for this session */
  }
  listeners.forEach((l) => l());
}

export function toggleTheme() {
  setTheme(currentTheme === 'bright' ? 'dark' : 'bright');
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
