import { render, screen } from '@testing-library/react';

import { PackProgress } from '../PackProgress';
import { BIN_COUNT, type ShadowingClip } from '@easyeng/core';

const clip = (idx: number, bestScore: number | null): ShadowingClip => ({
  clipId: `c${idx}`,
  idx,
  textEn: `Sentence ${idx}.`,
  textVi: `Câu ${idx}.`,
  audioPath: `shadowing/pack/${idx}.mp3`,
  durationMs: 2000,
  referenceEnvelope: { bins: new Array(BIN_COUNT).fill(0.5), durationMs: 2000 },
  bestScore,
});

describe('PackProgress', () => {
  it('renders one marker per clip', () => {
    render(
      <PackProgress clips={[clip(0, 80), clip(1, null), clip(2, 40)]} currentIndex={0} carriedOver={null} />,
    );
    expect(screen.getAllByTestId('progress-dot')).toHaveLength(3);
  });

  it('counts only clips at or above the pass threshold', () => {
    // 80 passes, 40 does not, null was never attempted.
    render(
      <PackProgress clips={[clip(0, 80), clip(1, null), clip(2, 40)]} currentIndex={0} carriedOver={null} />,
    );
    expect(screen.getByTestId('progress-count')).toHaveTextContent('1/3');
  });

  it('marks a clip exactly at the threshold as passed', () => {
    render(<PackProgress clips={[clip(0, 60)]} currentIndex={0} carriedOver={null} />);
    expect(screen.getByTestId('progress-count')).toHaveTextContent('1/1');
  });

  it('celebrates a fully completed pack', () => {
    render(
      <PackProgress clips={[clip(0, 90), clip(1, 75)]} currentIndex={0} carriedOver={null} />,
    );
    expect(screen.getByTestId('progress-complete')).toBeInTheDocument();
  });

  it('does not celebrate an incomplete pack', () => {
    render(
      <PackProgress clips={[clip(0, 90), clip(1, 20)]} currentIndex={0} carriedOver={null} />,
    );
    expect(screen.queryByTestId('progress-complete')).not.toBeInTheDocument();
  });

  it('announces carried-over scores', () => {
    render(<PackProgress clips={[clip(0, 82)]} currentIndex={0} carriedOver={2} />);
    expect(screen.getByTestId('progress-carried')).toHaveTextContent('2');
  });

  it('says nothing about carry-over when there was none', () => {
    render(<PackProgress clips={[clip(0, 82)]} currentIndex={0} carriedOver={null} />);
    expect(screen.queryByTestId('progress-carried')).not.toBeInTheDocument();
  });

  it('renders nothing for an empty pack', () => {
    const { container } = render(<PackProgress clips={[]} currentIndex={0} carriedOver={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('gives a passed clip and an unattempted clip distinct accessible labels', () => {
    render(
      <PackProgress clips={[clip(0, 82), clip(1, null)]} currentIndex={0} carriedOver={null} />,
    );
    const dots = screen.getAllByTestId('progress-dot');
    expect(dots[0]).toHaveAttribute('role', 'img');
    expect(dots[0].getAttribute('aria-label')).toMatch(/đã đạt/);
    expect(dots[0].getAttribute('aria-label')).toMatch(/82/);
    expect(dots[1].getAttribute('aria-label')).toMatch(/chưa luyện/);
    expect(dots[0].getAttribute('aria-label')).not.toBe(dots[1].getAttribute('aria-label'));
  });

  it('overrides the server-derived passed count with a live count when provided', () => {
    render(
      <PackProgress
        clips={[clip(0, 80), clip(1, null), clip(2, 40)]}
        currentIndex={0}
        carriedOver={null}
        livePassedCount={3}
      />,
    );
    expect(screen.getByTestId('progress-count')).toHaveTextContent('3/3');
  });

  it('fires the completion banner from liveComplete even when bestScore-derived counts disagree', () => {
    render(
      <PackProgress
        clips={[clip(0, 80), clip(1, 20)]}
        currentIndex={0}
        carriedOver={null}
        liveComplete
      />,
    );
    expect(screen.getByTestId('progress-complete')).toBeInTheDocument();
  });

  it('reflects the just-scored clip in its own dot via liveResult', () => {
    render(
      <PackProgress
        clips={[clip(0, null), clip(1, null)]}
        currentIndex={0}
        carriedOver={null}
        liveResult={{ clipId: 'c0', passed: true }}
      />,
    );
    const dots = screen.getAllByTestId('progress-dot');
    expect(dots[0].getAttribute('aria-label')).toMatch(/đã đạt/);
    expect(dots[1].getAttribute('aria-label')).toMatch(/chưa luyện/);
  });
});
