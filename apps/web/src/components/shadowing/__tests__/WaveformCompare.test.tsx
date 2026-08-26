import { render, screen } from '@testing-library/react';

import { WaveformCompare, timingHint } from '../WaveformCompare';
import { BIN_COUNT, type Envelope } from '@easyeng/core';

const flat = (value: number, durationMs: number): Envelope => ({
  bins: new Array(BIN_COUNT).fill(value),
  durationMs,
});

describe('timingHint', () => {
  it('reports speaking faster when the attempt is meaningfully shorter', () => {
    expect(timingHint(flat(0.5, 3000), flat(0.5, 2000))).toMatch(/nhanh hơn/);
  });

  it('reports speaking slower when the attempt is meaningfully longer', () => {
    expect(timingHint(flat(0.5, 2000), flat(0.5, 3000))).toMatch(/chậm hơn/);
  });

  it('returns null when the durations are close enough', () => {
    expect(timingHint(flat(0.5, 2000), flat(0.5, 2050))).toBeNull();
  });
});

describe('WaveformCompare', () => {
  it('renders a bar per bin for both envelopes', () => {
    const { container } = render(
      <WaveformCompare reference={flat(0.5, 2000)} attempt={flat(0.4, 2100)} />,
    );
    expect(container.querySelectorAll('[data-testid="wave-bar"]')).toHaveLength(BIN_COUNT * 2);
  });

  it('labels both rows', () => {
    render(<WaveformCompare reference={flat(0.5, 2000)} attempt={flat(0.4, 2000)} />);
    expect(screen.getByText(/Người bản xứ/)).toBeInTheDocument();
    expect(screen.getByText(/^Bạn$/)).toBeInTheDocument();
  });

  it('shows the timing hint when durations differ', () => {
    render(<WaveformCompare reference={flat(0.5, 3000)} attempt={flat(0.5, 2000)} />);
    expect(screen.getByTestId('timing-hint')).toBeInTheDocument();
  });

  it('omits the timing hint when durations match', () => {
    render(<WaveformCompare reference={flat(0.5, 2000)} attempt={flat(0.5, 2000)} />);
    expect(screen.queryByTestId('timing-hint')).not.toBeInTheDocument();
  });
});
