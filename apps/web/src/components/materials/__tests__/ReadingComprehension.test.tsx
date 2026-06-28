import { render, screen, fireEvent } from '@testing-library/react';
import { ReadingComprehension } from '../ReadingComprehension';
import type { MaterialSection } from '@easyeng/core';

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
    render(<ReadingComprehension sections={sections} locale="en" />);
    expect(screen.getByText('The passage.')).toBeInTheDocument();
    expect(screen.getByText('Where?')).toBeInTheDocument();
    expect(screen.getByText('Why?')).toBeInTheDocument();
  });

  it('hides answers until the per-question toggle is clicked', () => {
    render(<ReadingComprehension sections={sections} locale="en" />);
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
    render(<ReadingComprehension sections={passageOnly} locale="en" />);
    expect(screen.getByText('Only passage.')).toBeInTheDocument();
    expect(screen.queryByTestId('reveal-answer')).not.toBeInTheDocument();
  });

  it('renders nothing when there are no passage or drill sections', () => {
    const { container } = render(
      <ReadingComprehension sections={[{ id: 'i', idx: 0, kind: 'intro', body_vi: 'a', body_en: 'b', meta: {} }]} locale="en" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
