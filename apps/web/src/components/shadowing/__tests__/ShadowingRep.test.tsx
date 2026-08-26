import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ShadowingRep } from '../ShadowingRep';
import { BIN_COUNT, type ShadowingClip } from '@easyeng/core';

const mockRecorder = {
  state: 'idle' as const,
  error: null as string | null,
  hasRecognition: true,
  start: jest.fn(),
  stop: jest.fn(),
  result: null as unknown,
  reset: jest.fn(),
  liveSamples: [] as number[],
};

jest.mock('../useRecorder', () => ({
  useRecorder: () => mockRecorder,
}));

const clip = (idx: number): ShadowingClip => ({
  clipId: `c${idx}`,
  idx,
  textEn: `Sentence number ${idx}.`,
  textVi: `Câu số ${idx}.`,
  audioPath: `shadowing/pack/${idx}.mp3`,
  durationMs: 2000,
  referenceEnvelope: { bins: new Array(BIN_COUNT).fill(0.5), durationMs: 2000 },
  bestScore: null,
});

const clips = [clip(0), clip(1), clip(2), clip(3)];

describe('ShadowingRep', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    mockRecorder.result = null;
    mockRecorder.error = null;
    mockRecorder.state = 'idle';
  });

  it('shows the first clip text and position', () => {
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.getByText('Sentence number 0.')).toBeInTheDocument();
    expect(screen.getByText(/1\s*\/\s*4/)).toBeInTheDocument();
  });

  it('shows the Vietnamese translation', () => {
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.getByText('Câu số 0.')).toBeInTheDocument();
  });

  it('does not show the waveform comparison before an attempt', () => {
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.queryByText(/Người bản xứ/)).not.toBeInTheDocument();
  });

  it('starts recording when the mic button is pressed', async () => {
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    await userEvent.click(screen.getByTestId('rep-record'));
    expect(mockRecorder.start).toHaveBeenCalled();
  });

  it('shows a live level meter while recording', () => {
    mockRecorder.state = 'recording';
    mockRecorder.liveSamples = [0.2, 0.8, 0.5];
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.getAllByTestId('live-bar')).toHaveLength(3);
    mockRecorder.liveSamples = [];
  });

  it('explains a denied mic instead of dead-ending', () => {
    mockRecorder.error = 'mic-denied';
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.getByTestId('rep-error')).toHaveTextContent(/micro/i);
  });

  it('treats a silent take as a no-op rather than a zero score', () => {
    mockRecorder.error = 'no-audio';
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.getByTestId('rep-error')).toBeInTheDocument();
    expect(screen.queryByTestId('rep-score')).not.toBeInTheDocument();
  });

  it('notes that word scoring is unavailable without recognition support', () => {
    mockRecorder.hasRecognition = false;
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.getByTestId('rep-rhythm-only')).toBeInTheDocument();
    mockRecorder.hasRecognition = true;
  });

  it('walls an anonymous user after the daily clip limit', () => {
    window.localStorage.setItem(
      'easyeng.shadowing.anon',
      JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        attempts: [
          { clipId: 'c0', overall: 80 },
          { clipId: 'c1', overall: 70 },
          { clipId: 'c2', overall: 90 },
        ],
      }),
    );
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.getByTestId('wall-signup')).toBeInTheDocument();
  });

  it('never walls an authenticated user', () => {
    window.localStorage.setItem(
      'easyeng.shadowing.anon',
      JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        attempts: [
          { clipId: 'c0', overall: 80 },
          { clipId: 'c1', overall: 70 },
          { clipId: 'c2', overall: 90 },
        ],
      }),
    );
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated />,
    );
    expect(screen.queryByTestId('wall-signup')).not.toBeInTheDocument();
  });
});
