import { render, screen, waitFor } from '@testing-library/react';
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

const mockRecordAttempt = jest.fn();
let mockRecordResult: unknown = null;
jest.mock('../useRecordAttempt', () => ({
  useRecordAttempt: () => ({ record: mockRecordAttempt, result: mockRecordResult, error: null }),
}));

jest.mock('../useCarryOverAnonProgress', () => ({
  useCarryOverAnonProgress: () => ({ carriedOver: null }),
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
    mockRecordAttempt.mockClear();
    // Reset EVERY mutable mock field here, not in test bodies: a test that
    // throws before its cleanup line would otherwise leak state into the rest
    // of the file.
    mockRecorder.result = null;
    mockRecorder.error = null;
    mockRecorder.state = 'idle';
    mockRecorder.hasRecognition = true;
    mockRecorder.liveSamples = [];
    mockRecordResult = null;
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
  });

  it('walls an anonymous user after the daily clip limit', () => {
    window.localStorage.setItem(
      'easyeng.shadowing.anon',
      JSON.stringify({
        // Vietnam-local date, matching anonProgress.today() (see Task 7).
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }),
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
        // Vietnam-local date, matching anonProgress.today() (see Task 7).
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }),
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

  it('shows pack progress to an authenticated user', () => {
    render(
      <ShadowingRep
        clips={clips}
        audioBaseUrl="https://cdn.test/"
        locale="vi"
        isAuthenticated
        userId="u1"
      />,
    );
    expect(screen.getByTestId('progress-count')).toBeInTheDocument();
  });

  it('hides pack progress from an anonymous visitor', () => {
    render(
      <ShadowingRep
        clips={clips}
        audioBaseUrl="https://cdn.test/"
        locale="vi"
        isAuthenticated={false}
      />,
    );
    expect(screen.queryByTestId('progress-count')).not.toBeInTheDocument();
  });

  it('records the attempt when a signed-in user scores', async () => {
    mockRecorder.result = {
      envelope: { bins: new Array(BIN_COUNT).fill(0.5), durationMs: 2000 },
      transcript: 'Sentence number 0.',
    };
    render(
      <ShadowingRep
        clips={clips}
        audioBaseUrl="https://cdn.test/"
        locale="vi"
        isAuthenticated
        userId="u1"
      />,
    );
    await waitFor(() => expect(mockRecordAttempt).toHaveBeenCalledTimes(1));
    expect(mockRecordAttempt.mock.calls[0][0].clipId).toBe('c0');
  });

  it('does not record anything for an anonymous visitor', async () => {
    mockRecorder.result = {
      envelope: { bins: new Array(BIN_COUNT).fill(0.5), durationMs: 2000 },
      transcript: 'Sentence number 0.',
    };
    render(
      <ShadowingRep
        clips={clips}
        audioBaseUrl="https://cdn.test/"
        locale="vi"
        isAuthenticated={false}
      />,
    );
    await waitFor(() => expect(screen.getByTestId('rep-score')).toBeInTheDocument());
    expect(mockRecordAttempt).not.toHaveBeenCalled();
  });

  it('overrides the server-rendered progress count with the live result in-session', () => {
    // clips[].bestScore is server-rendered and never changes client-side;
    // the live count from useRecordAttempt's result must take over so the
    // strip updates without a reload.
    mockRecordResult = { packComplete: false, clipsPassed: 3, clipsTotal: 4 };
    render(
      <ShadowingRep
        clips={clips}
        audioBaseUrl="https://cdn.test/"
        locale="vi"
        isAuthenticated
        userId="u1"
      />,
    );
    expect(screen.getByTestId('progress-count')).toHaveTextContent('3/4');
  });

  it('fires the completion banner from a live result in the same session', () => {
    mockRecordResult = { packComplete: true, clipsPassed: 4, clipsTotal: 4 };
    render(
      <ShadowingRep
        clips={clips}
        audioBaseUrl="https://cdn.test/"
        locale="vi"
        isAuthenticated
        userId="u1"
      />,
    );
    expect(screen.getByTestId('progress-complete')).toBeInTheDocument();
  });
});
