// at top of ReadingComprehension.test.tsx, before other imports of the component:
const awardSpy = jest.fn();
jest.mock('../useAwardCompletion', () => ({
  useAwardCompletion: (args: any) => {
    awardSpy(args);
    // emulate an award when it should fire
    return {
      awarded: args.shouldAward && !args.alreadyCompleted && args.userId
        ? { gems: 3, xp: 80 }
        : null,
      submitting: false,
      error: null,
    };
  },
}));

// ProgressRibbon (rendered on a passing score) imports next-intl's useTranslations,
// whose ESM build Jest can't parse — mock it to a passthrough.
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { ReadingComprehension, hasComprehensionQuestions } from '../ReadingComprehension';
import type { MaterialSection } from '@easyeng/core';

beforeEach(() => awardSpy.mockClear());

const fiveQ = (n = 5) =>
  Array.from({ length: n }, (_, i) => ({ q_en: `Q${i}?`, q_vi: `Câu ${i}?`, answer_en: `A${i}` }));

const sectionsWith = (questions: any[]): MaterialSection[] => [
  { id: 'p', idx: 0, kind: 'passage', body_vi: 'Đoạn.', body_en: 'Passage.', meta: {} },
  { id: 'd', idx: 1, kind: 'drill', body_vi: 'q', body_en: 'q', meta: { questions } },
];

function markAll(mark: ('right' | 'wrong')[]) {
  // reveal + mark each question per the mark[] array
  const reveals = screen.getAllByTestId('reveal-answer');
  reveals.forEach((b) => fireEvent.click(b));
  const rightBtns = screen.getAllByTestId('mark-right');
  const wrongBtns = screen.getAllByTestId('mark-wrong');
  mark.forEach((m, i) => fireEvent.click(m === 'right' ? rightBtns[i] : wrongBtns[i]));
}

const sections: MaterialSection[] = [
  { id: 'p', idx: 0, kind: 'passage', body_vi: 'Đoạn văn.', body_en: 'The passage.', meta: {} },
  {
    id: 'd', idx: 1, kind: 'drill', body_vi: 'Câu hỏi', body_en: 'Questions',
    meta: { questions: [
      { q_en: 'Where?', q_vi: 'Ở đâu?', answer_en: 'On the river.' },
      { q_en: 'Why?', q_vi: 'Tại sao?', answer_en: 'Because.' },
    ] },
  },
];

describe('ReadingComprehension', () => {
  it('renders the passage and the question text', () => {
    render(<ReadingComprehension sections={sections} locale="en" userId="u1" materialId="m1" alreadyCompleted={false} />);
    expect(screen.getByText('The passage.')).toBeInTheDocument();
    expect(screen.getByText('Where?')).toBeInTheDocument();
    expect(screen.getByText('Why?')).toBeInTheDocument();
  });

  it('hides answers until the per-question toggle is clicked', () => {
    render(<ReadingComprehension sections={sections} locale="en" userId="u1" materialId="m1" alreadyCompleted={false} />);
    expect(screen.queryByText('On the river.')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByTestId('reveal-answer')[0]);
    expect(screen.getByText('On the river.')).toBeInTheDocument();
    // second answer still hidden
    expect(screen.queryByText('Because.')).not.toBeInTheDocument();
  });

  it('renders the passage only when meta.questions is missing', () => {
    const passageOnly: MaterialSection[] = [
      { id: 'p', idx: 0, kind: 'passage', body_vi: 'x', body_en: 'Only passage.', meta: {} },
      { id: 'd', idx: 1, kind: 'drill', body_vi: 'q', body_en: 'q', meta: {} },
    ];
    render(<ReadingComprehension sections={passageOnly} locale="en" userId="u1" materialId="m1" alreadyCompleted={false} />);
    expect(screen.getByText('Only passage.')).toBeInTheDocument();
    expect(screen.queryByTestId('reveal-answer')).not.toBeInTheDocument();
  });

  it('renders nothing when there are no passage or drill sections', () => {
    const { container } = render(
      <ReadingComprehension sections={[{ id: 'i', idx: 0, kind: 'intro', body_vi: 'a', body_en: 'b', meta: {} }]} locale="en" userId="u1" materialId="m1" alreadyCompleted={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ReadingComprehension self-grading', () => {
  const base = { locale: 'en' as const, userId: 'u1', materialId: 'm1', alreadyCompleted: false };

  it('all-right scores 100% and fires award with score=100', () => {
    render(<ReadingComprehension sections={sectionsWith(fiveQ())} {...base} />);
    markAll(['right', 'right', 'right', 'right', 'right']);
    expect(screen.getByTestId('comprehension-score')).toHaveTextContent('100%');
    const lastCall = awardSpy.mock.calls.at(-1)![0];
    expect(lastCall.shouldAward).toBe(true);
    expect(lastCall.score).toBe(100);
  });

  it('mixed 4/5 scores 80% and passes', () => {
    render(<ReadingComprehension sections={sectionsWith(fiveQ())} {...base} />);
    markAll(['right', 'right', 'right', 'right', 'wrong']);
    expect(screen.getByTestId('comprehension-score')).toHaveTextContent('80%');
    expect(awardSpy.mock.calls.at(-1)![0].shouldAward).toBe(true);
  });

  it('below threshold (2/5=40%) fails, no award, Try again resets', () => {
    render(<ReadingComprehension sections={sectionsWith(fiveQ())} {...base} />);
    markAll(['right', 'right', 'wrong', 'wrong', 'wrong']);
    expect(screen.getByTestId('comprehension-score')).toHaveTextContent('40%');
    expect(awardSpy.mock.calls.at(-1)![0].shouldAward).toBe(false);
    const retry = screen.getByTestId('comprehension-retry');
    fireEvent.click(retry);
    // after reset: result panel gone, reveal buttons back
    expect(screen.queryByTestId('comprehension-score')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('reveal-answer').length).toBe(5);
  });

  it('anonymous user sees score but no award + sign-in CTA', () => {
    render(<ReadingComprehension sections={sectionsWith(fiveQ())} {...base} userId={null} />);
    markAll(['right', 'right', 'right', 'right', 'right']);
    expect(screen.getByTestId('comprehension-score')).toHaveTextContent('100%');
    expect(awardSpy.mock.calls.at(-1)![0].shouldAward).toBe(false);
    expect(screen.getByTestId('comprehension-signin')).toBeInTheDocument();
  });

  it('hasComprehensionQuestions reflects presence of questions', () => {
    expect(hasComprehensionQuestions(sectionsWith(fiveQ()))).toBe(true);
    expect(hasComprehensionQuestions([
      { id: 'p', idx: 0, kind: 'passage', body_vi: 'x', body_en: 'y', meta: {} },
    ])).toBe(false);
  });
});
