jest.mock('../useAwardCompletion', () => ({
  useAwardCompletion: () => ({ awarded: null, submitting: false, error: null }),
}));
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
jest.mock('../PronunciationPractice', () => ({
  __esModule: true,
  default: () => null,
}));

import { render, screen } from '@testing-library/react';
import { ReadingPassage } from '../ReadingPassage';
import type { MaterialDetail, MaterialSection } from '@easyeng/core';

const material = {
  id: 'm1',
  body_vi: '# Bài đọc\nNội dung.',
  body_en: '# Reading\nContent.',
} as unknown as MaterialDetail;

const withQuestions: MaterialSection[] = [
  { id: 'p', idx: 0, kind: 'passage', body_vi: 'Đoạn.', body_en: 'Passage.', meta: {} },
  {
    id: 'd', idx: 1, kind: 'drill', body_vi: 'q', body_en: 'q',
    meta: { questions: [{ q_en: 'Q?', q_vi: 'Câu?', answer_en: 'A' }] },
  },
];
const noQuestions: MaterialSection[] = [];

describe('ReadingPassage completion path', () => {
  const base = { material, locale: 'en' as const, userId: 'u1', alreadyCompleted: false };

  it('hides its own mark-done button when comprehension questions exist', () => {
    render(<ReadingPassage {...base} sections={withQuestions} />);
    expect(screen.queryByTestId('reading-mark-done')).not.toBeInTheDocument();
    expect(screen.getByTestId('reading-comprehension')).toBeInTheDocument();
  });

  it('keeps the mark-done button for passage-only readings (no questions)', () => {
    render(<ReadingPassage {...base} sections={noQuestions} />);
    expect(screen.getByTestId('reading-mark-done')).toBeInTheDocument();
  });
});
