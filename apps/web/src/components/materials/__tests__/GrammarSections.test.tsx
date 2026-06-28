import { render, screen } from '@testing-library/react';
import { GrammarSections } from '../GrammarSections';
import type { MaterialSection } from '@easyeng/core';

const sections: MaterialSection[] = [
  { id: '1', idx: 0, kind: 'intro', body_vi: 'Giới thiệu', body_en: 'Intro', meta: {} },
  { id: '2', idx: 1, kind: 'pattern', body_vi: 'Cấu trúc câu', body_en: 'Sentence pattern', meta: {} },
  { id: '3', idx: 2, kind: 'drill', body_vi: 'Bài tập', body_en: 'Practice drill', meta: {} },
];

describe('GrammarSections', () => {
  it('renders a block per intro/pattern/drill section (en locale)', () => {
    render(<GrammarSections sections={sections} locale="en" />);
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Sentence pattern')).toBeInTheDocument();
    expect(screen.getByText('Practice drill')).toBeInTheDocument();
  });

  it('shows Vietnamese bodies for vi locale', () => {
    render(<GrammarSections sections={sections} locale="vi" />);
    expect(screen.getByText('Cấu trúc câu')).toBeInTheDocument();
  });

  it('renders nothing when there are no grammar sections', () => {
    const { container } = render(
      <GrammarSections sections={[{ id: '9', idx: 0, kind: 'dialogue_line', body_vi: 'a', body_en: 'b', meta: {} }]} locale="en" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
