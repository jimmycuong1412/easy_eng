import { render, screen } from '@testing-library/react';
import { DialogueLines } from '../DialogueLines';
import type { MaterialSection } from '@easyeng/core';

const lines: MaterialSection[] = [
  { id: '1', idx: 0, kind: 'dialogue_line', body_vi: 'Chào anh!', body_en: 'Hello!', meta: { speaker: 'Waiter' } },
  { id: '2', idx: 1, kind: 'dialogue_line', body_vi: 'Chào chị.', body_en: 'Hi.', meta: { speaker: 'Customer' } },
];

describe('DialogueLines', () => {
  it('renders one row per dialogue_line with speaker and line', () => {
    render(<DialogueLines sections={lines} locale="en" />);
    expect(screen.getByText('Waiter')).toBeInTheDocument();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Hi.')).toBeInTheDocument();
  });

  it('shows the Vietnamese line for vi locale', () => {
    render(<DialogueLines sections={lines} locale="vi" />);
    expect(screen.getByText('Chào anh!')).toBeInTheDocument();
  });

  it('falls back to a generic label when speaker is not a string', () => {
    const bad: MaterialSection[] = [
      { id: '3', idx: 0, kind: 'dialogue_line', body_vi: 'x', body_en: 'y', meta: {} },
    ];
    render(<DialogueLines sections={bad} locale="en" />);
    expect(screen.getByText('y')).toBeInTheDocument();
  });

  it('renders nothing when there are no dialogue_line sections', () => {
    const { container } = render(
      <DialogueLines sections={[{ id: '4', idx: 0, kind: 'intro', body_vi: 'a', body_en: 'b', meta: {} }]} locale="en" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
