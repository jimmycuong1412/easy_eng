/**
 * Unit tests for <MaterialEditor> field validation.
 * TDD: these must FAIL until T035/T036 are implemented.
 *
 * Covers:
 *  - title_vi is required (empty → validation error)
 *  - summary_vi is required
 *  - vocabulary_pack requires ≥ 8 vocabulary items before saving
 *  - mock_test requires ≥ 5 test items before saving
 *  - optimistic-lock conflict message renders on 409
 *  - draft saves successfully when validation passes
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (ns?: string) => (key: string) => `${ns ?? ''}.${key}`,
}));

// Mock Supabase client — chain: from().upsert().select().maybeSingle()
const mockMaybeSingle = jest.fn();
const mockSelect = jest.fn(() => ({ maybeSingle: mockMaybeSingle, eq: jest.fn(() => ({ single: jest.fn() })) }));
const mockUpsert = jest.fn(() => ({ select: mockSelect }));
const mockFrom = jest.fn(() => ({ upsert: mockUpsert, select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn() })) })) }));
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: mockFrom, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) } }),
}));

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useParams: () => ({ locale: 'vi', id: 'new' }),
}));

// Import AFTER mocks are set up
import { MaterialEditor } from '@/components/materials/editor/MaterialEditor';

const MINIMAL_VOCAB_DRAFT = {
  id: null,
  type: 'vocabulary_pack' as const,
  level: 'a1' as const,
  goal: null,
  status: 'draft' as const,
  title_vi: '',
  title_en: null,
  summary_vi: '',
  summary_en: null,
  body_vi: '',
  body_en: null,
  duration_min: 10,
  gems_reward: 2,
  xp_reward: 30,
  min_completion_pct: 80,
  cover_path: null,
  author_id: 'user-1',
  updated_at: new Date().toISOString(),
};

describe('<MaterialEditor> validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-wire the chain after clearAllMocks resets return values
    mockUpsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ maybeSingle: mockMaybeSingle });
  });

  it('shows required error when title_vi is empty on save', async () => {
    render(
      <MaterialEditor
        initialData={MINIMAL_VOCAB_DRAFT}
        onSaved={jest.fn()}
      />,
    );

    const saveBtn = screen.getByTestId('editor-save-draft');
    await userEvent.click(saveBtn);

    expect(screen.getByTestId('error-title_vi')).toBeInTheDocument();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('shows required error when summary_vi is empty on save', async () => {
    render(
      <MaterialEditor
        initialData={{ ...MINIMAL_VOCAB_DRAFT, title_vi: 'Test title' }}
        onSaved={jest.fn()}
      />,
    );

    const saveBtn = screen.getByTestId('editor-save-draft');
    await userEvent.click(saveBtn);

    expect(screen.getByTestId('error-summary_vi')).toBeInTheDocument();
  });

  it('shows vocab item count error for vocabulary_pack with fewer than 8 items', async () => {
    render(
      <MaterialEditor
        initialData={{
          ...MINIMAL_VOCAB_DRAFT,
          title_vi: 'My vocab pack',
          summary_vi: 'Summary here',
        }}
        initialVocabItems={[
          { idx: 0, term: 'hello', gloss_vi: 'xin chào', example_en: 'Hello!', example_vi: 'Xin chào!' },
          { idx: 1, term: 'hi', gloss_vi: 'chào', example_en: 'Hi!', example_vi: 'Chào!' },
        ]}
        onSaved={jest.fn()}
      />,
    );

    const saveBtn = screen.getByTestId('editor-save-draft');
    await userEvent.click(saveBtn);

    expect(screen.getByTestId('error-vocab-items')).toBeInTheDocument();
  });

  it('does NOT show vocab item error when exactly 8 items are provided', async () => {
    const eightItems = Array.from({ length: 8 }, (_, i) => ({
      idx: i,
      term: `word${i}`,
      gloss_vi: `nghĩa${i}`,
      example_en: `Example ${i}`,
      example_vi: `Ví dụ ${i}`,
    }));

    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'new-id', updated_at: new Date().toISOString() }, error: null });

    render(
      <MaterialEditor
        initialData={{
          ...MINIMAL_VOCAB_DRAFT,
          title_vi: 'My vocab pack',
          summary_vi: 'Summary here',
          body_vi: 'Body text',
        }}
        initialVocabItems={eightItems}
        onSaved={jest.fn()}
      />,
    );

    const saveBtn = screen.getByTestId('editor-save-draft');
    await userEvent.click(saveBtn);

    expect(screen.queryByTestId('error-vocab-items')).not.toBeInTheDocument();
  });

  it('shows mock test item count error for mock_test with fewer than 5 items', async () => {
    render(
      <MaterialEditor
        initialData={{
          ...MINIMAL_VOCAB_DRAFT,
          type: 'mock_test',
          title_vi: 'My test',
          summary_vi: 'Summary',
        }}
        initialTestItems={[
          {
            idx: 0, format: 'multiple_choice',
            prompt_vi: 'Q1', prompt_en: 'Q1 EN',
            options_en: ['A', 'B', 'C', 'D'], correct_index: 0,
            explanation_vi: 'Giải thích', points: 1,
          },
        ]}
        onSaved={jest.fn()}
      />,
    );

    const saveBtn = screen.getByTestId('editor-save-draft');
    await userEvent.click(saveBtn);

    expect(screen.getByTestId('error-test-items')).toBeInTheDocument();
  });

  it('shows conflict message when save returns 409 (optimistic lock failure)', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '409', message: 'Conflict', details: '' },
    });

    // Use grammar_lesson (no item-count requirement) to reach the save path
    render(
      <MaterialEditor
        initialData={{
          ...MINIMAL_VOCAB_DRAFT,
          type: 'grammar_lesson',
          title_vi: 'Title',
          summary_vi: 'Summary',
          body_vi: 'Body',
        }}
        onSaved={jest.fn()}
      />,
    );

    const saveBtn = screen.getByTestId('editor-save-draft');
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByTestId('editor-conflict-banner')).toBeInTheDocument();
    });
  });

  it('calls onSaved after a successful draft upsert', async () => {
    const onSaved = jest.fn();
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'mat-1', updated_at: new Date().toISOString() },
      error: null,
    });

    // Use grammar_lesson to bypass item-count validation
    render(
      <MaterialEditor
        initialData={{
          ...MINIMAL_VOCAB_DRAFT,
          type: 'grammar_lesson',
          title_vi: 'Valid title',
          summary_vi: 'Valid summary',
          body_vi: 'Body content',
        }}
        onSaved={onSaved}
      />,
    );

    const saveBtn = screen.getByTestId('editor-save-draft');
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith('mat-1');
    });
  });
});
