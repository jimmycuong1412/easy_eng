import {
  getTheme,
  setTheme,
  toggleTheme,
  initThemeFromStorage,
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

  it('initThemeFromStorage adopts a persisted dark choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    initThemeFromStorage();
    expect(getTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
