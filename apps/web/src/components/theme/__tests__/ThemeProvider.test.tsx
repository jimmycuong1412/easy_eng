import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeProvider';

function Probe() {
  const { theme, toggle } = useTheme();
  return <button onClick={toggle}>theme:{theme}</button>;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('bright', 'dark');
  });

  it('defaults to bright and reflects on <html>', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText('theme:bright')).toBeInTheDocument();
    expect(document.documentElement.classList.contains('bright')).toBe(true);
  });

  it('toggle switches to dark and persists', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    act(() => {
      screen.getByRole('button').click();
    });
    expect(screen.getByText('theme:dark')).toBeInTheDocument();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('easyeng-theme')).toBe('dark');
  });

  it('reads persisted theme on mount', () => {
    localStorage.setItem('easyeng-theme', 'dark');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText('theme:dark')).toBeInTheDocument();
  });
});
