import {
  getTheme,
  getServerTheme,
  setTheme,
  toggleTheme,
  subscribe,
  THEME_STORAGE_KEY,
} from '../theme-store';

describe('theme-store', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    setTheme('bright');
  });

  it('defaults to bright', () => {
    expect(getTheme()).toBe('bright');
  });

  it('setTheme updates state, <html data-theme>, and localStorage', () => {
    setTheme('dark');
    expect(getTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('toggleTheme flips between bright and dark', () => {
    setTheme('bright');
    toggleTheme();
    expect(getTheme()).toBe('dark');
    toggleTheme();
    expect(getTheme()).toBe('bright');
  });

  it('always reports bright as the server snapshot', () => {
    setTheme('dark');
    // SSR renders data-theme="bright"; the server snapshot must match that so
    // useSyncExternalStore hydrates without a mismatch.
    expect(getServerTheme()).toBe('bright');
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const seen: string[] = [];
    const unsubscribe = subscribe(() => seen.push(getTheme()));

    setTheme('dark');
    expect(seen).toEqual(['dark']);

    unsubscribe();
    setTheme('bright');
    expect(seen).toEqual(['dark']);
  });
});
