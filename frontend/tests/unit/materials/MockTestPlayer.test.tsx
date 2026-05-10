import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MockTestPlayer } from '@/components/materials/MockTestPlayer';
import type { MockTestQuestion } from '@/lib/queries/materials';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) => {
    if (vars) {
      const stringified = Object.entries(vars)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
      return `${key}(${stringified})`;
    }
    return key;
  },
}));

// Mock the Supabase client; tests inject the RPC return value via this var
const rpcMock = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: (...args: unknown[]) => rpcMock(...args),
  }),
}));

const QUESTIONS: MockTestQuestion[] = [
  {
    id: 'q1',
    idx: 0,
    format: 'multiple_choice',
    prompt_vi: 'Chọn đáp án đúng:',
    prompt_en: 'She ___ to school every day.',
    options_en: ['go', 'goes', 'going', 'gone'],
    options_vi: ['go', 'goes', 'going', 'gone'],
    points: 1,
  },
  {
    id: 'q2',
    idx: 1,
    format: 'multiple_choice',
    prompt_vi: 'Chọn đáp án đúng:',
    prompt_en: 'I ___ a movie last night.',
    options_en: ['watch', 'watched', 'watches', 'watching'],
    options_vi: ['watch', 'watched', 'watches', 'watching'],
    points: 1,
  },
];

const baseProps = {
  materialId: 'mat-1',
  questions: QUESTIONS,
  userId: 'user-1',
  locale: 'vi' as const,
};

describe('<MockTestPlayer>', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('renders one prompt per question with their options', () => {
    render(<MockTestPlayer {...baseProps} />);
    expect(screen.getByText(/She ___ to school/)).toBeInTheDocument();
    expect(screen.getByText(/I ___ a movie/)).toBeInTheDocument();
    // 4 options × 2 questions = 8 radio inputs
    expect(screen.getAllByRole('radio')).toHaveLength(8);
  });

  it('disables submit until every question has an answer', () => {
    render(<MockTestPlayer {...baseProps} />);
    const submit = screen.getByRole('button', { name: /materials\.test\.submit/ });
    expect(submit).toBeDisabled();

    // Answer one — still disabled
    fireEvent.click(screen.getAllByRole('radio')[0]);
    expect(submit).toBeDisabled();

    // Answer the second — now enabled
    fireEvent.click(screen.getAllByRole('radio')[5]);
    expect(submit).not.toBeDisabled();
  });

  it('calls grade_mock_test with the answer payload on submit', async () => {
    rpcMock.mockResolvedValue({
      data: {
        score_pct: 100,
        items_correct: 2,
        items_total: 2,
        passed: true,
        per_item: [
          { idx: 0, correct: true, correct_index: 1, explanation_vi: 'OK' },
          { idx: 1, correct: true, correct_index: 1, explanation_vi: 'OK' },
        ],
      },
      error: null,
    });

    render(<MockTestPlayer {...baseProps} />);
    fireEvent.click(screen.getAllByRole('radio')[1]); // q1: index 1
    fireEvent.click(screen.getAllByRole('radio')[5]); // q2: index 1
    fireEvent.click(screen.getByRole('button', { name: /materials\.test\.submit/ }));

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('grade_mock_test', {
        p_user_id: 'user-1',
        p_material_id: 'mat-1',
        p_answers: { '0': 1, '1': 1 },
      });
    });
  });

  it('renders the per-item result table after a successful submission', async () => {
    rpcMock.mockResolvedValue({
      data: {
        score_pct: 50,
        items_correct: 1,
        items_total: 2,
        passed: false,
        per_item: [
          {
            idx: 0,
            correct: true,
            correct_index: 1,
            explanation_vi: 'Đúng rồi!',
          },
          {
            idx: 1,
            correct: false,
            correct_index: 1,
            explanation_vi: '"Last night" là dấu hiệu quá khứ đơn.',
          },
        ],
      },
      error: null,
    });

    render(<MockTestPlayer {...baseProps} />);
    fireEvent.click(screen.getAllByRole('radio')[1]);
    fireEvent.click(screen.getAllByRole('radio')[4]); // wrong answer
    fireEvent.click(screen.getByRole('button', { name: /materials\.test\.submit/ }));

    await waitFor(() => {
      expect(
        screen.getByText('"Last night" là dấu hiệu quá khứ đơn.'),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/materials\.test\.score/)).toBeInTheDocument();
    expect(screen.getByText(/materials\.test\.failed/)).toBeInTheDocument();
    expect(screen.getByText(/materials\.test\.noReward/)).toBeInTheDocument();
  });

  it('shows the passed banner when score ≥ threshold', async () => {
    rpcMock.mockResolvedValue({
      data: {
        score_pct: 100,
        items_correct: 2,
        items_total: 2,
        passed: true,
        per_item: [
          { idx: 0, correct: true, correct_index: 1, explanation_vi: 'x' },
          { idx: 1, correct: true, correct_index: 1, explanation_vi: 'y' },
        ],
      },
      error: null,
    });

    render(<MockTestPlayer {...baseProps} />);
    fireEvent.click(screen.getAllByRole('radio')[1]);
    fireEvent.click(screen.getAllByRole('radio')[5]);
    fireEvent.click(screen.getByRole('button', { name: /materials\.test\.submit/ }));

    await waitFor(() => {
      expect(screen.getByText(/materials\.test\.passed/)).toBeInTheDocument();
    });
  });

  it('blocks submission when no userId is provided (anonymous viewer)', () => {
    render(<MockTestPlayer {...baseProps} userId={null} />);
    expect(
      screen.getByText(/materials\.detail\.signInCta/),
    ).toBeInTheDocument();
    // Submit button is not rendered for anonymous viewers
    expect(
      screen.queryByRole('button', { name: /materials\.test\.submit/ }),
    ).toBeNull();
  });
});
