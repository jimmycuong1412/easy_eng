import { render, screen } from '@testing-library/react';

import { MaterialCard } from '@/components/materials/MaterialCard';
import type {
  MaterialSummary,
  MaterialProgressLite,
} from '@/lib/queries/materials';

// Mock next-intl: return the message key as the rendered string so tests can
// assert on stable identifiers without coupling to the JSON file content.
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

const baseMaterial: MaterialSummary = {
  id: 'mat-1',
  slug: 'vocab-greetings-a1',
  type: 'vocabulary_pack',
  level: 'a1',
  goal: 'conversation',
  title_vi: 'Từ vựng chào hỏi cơ bản',
  title_en: 'Basic greeting vocabulary',
  summary_vi: 'Học 10 từ chào hỏi tiếng Anh.',
  summary_en: '10 essential English greetings.',
  duration_min: 8,
  gems_reward: 2,
  xp_reward: 30,
  cover_path: null,
  popularity_score: 5.4,
  published_at: '2026-05-09T10:00:00Z',
};

const completedProgress: MaterialProgressLite = {
  material_id: 'mat-1',
  state: 'completed',
  completion_pct: 100,
  completed_at: '2026-05-09T11:00:00Z',
  score_pct: null,
  gems_awarded: 2,
  xp_awarded: 30,
};

describe('<MaterialCard>', () => {
  it('renders the Vietnamese title when locale=vi', () => {
    render(<MaterialCard material={baseMaterial} locale="vi" />);
    expect(screen.getByText('Từ vựng chào hỏi cơ bản')).toBeInTheDocument();
  });

  it('renders the English title when locale=en', () => {
    render(<MaterialCard material={baseMaterial} locale="en" />);
    expect(screen.getByText('Basic greeting vocabulary')).toBeInTheDocument();
  });

  it('falls back to the Vietnamese summary on en locale when summary_en is null', () => {
    const material = { ...baseMaterial, summary_en: null };
    render(<MaterialCard material={material} locale="en" />);
    expect(screen.getByText('Học 10 từ chào hỏi tiếng Anh.')).toBeInTheDocument();
  });

  it('omits the progress strip when no progress is provided', () => {
    const { container } = render(
      <MaterialCard material={baseMaterial} locale="vi" />,
    );
    expect(container.querySelector('[data-testid="material-card-progress"]')).toBeNull();
  });

  it('shows the completion check when progress.state is completed', () => {
    render(
      <MaterialCard
        material={baseMaterial}
        progress={completedProgress}
        locale="vi"
      />,
    );
    expect(
      screen.getByTestId('material-card-progress'),
    ).toBeInTheDocument();
    // Translation key surfaces because of mock; check substring match
    expect(
      screen.getByText(/materials\.card\.completed/),
    ).toBeInTheDocument();
  });

  it('renders the lock + sign-in tooltip when anonymous=true', () => {
    render(
      <MaterialCard material={baseMaterial} locale="vi" anonymous />,
    );
    expect(
      screen.getByLabelText('materials.card.anonymousLockTooltip'),
    ).toBeInTheDocument();
  });

  it('renders the editorial design tokens (ed-card root)', () => {
    const { container } = render(<MaterialCard material={baseMaterial} locale="vi" />);
    expect(container.querySelector('.ed-card')).not.toBeNull();
  });

  it('uses the type pill label corresponding to the material type', () => {
    render(<MaterialCard material={baseMaterial} locale="vi" />);
    // Type translation key surfaces because of mock
    expect(
      screen.getByText('materials.type.vocabulary_pack'),
    ).toBeInTheDocument();
  });

  it('renders the badge when one is provided', () => {
    render(
      <MaterialCard material={baseMaterial} locale="vi" badge="recommended" />,
    );
    expect(
      screen.getByText('materials.card.badge.recommended'),
    ).toBeInTheDocument();
  });

  it('does not show a reward chip for mock_test type', () => {
    const mockTestMaterial: MaterialSummary = {
      ...baseMaterial,
      type: 'mock_test',
      gems_reward: 0,
      xp_reward: 0,
    };
    const { container } = render(
      <MaterialCard material={mockTestMaterial} locale="vi" />,
    );
    // The reward chip (ed-chip-coral in the footer row) must not appear for mock tests.
    // We check the translation key that would be emitted if the chip were rendered.
    expect(screen.queryByText(/materials\.card\.rewardLabel/)).toBeNull();
    // Confirm no gem symbol leaks through either
    expect(container.textContent).not.toMatch(/⟡/);
  });

  it('renders MaterialCard.Skeleton without errors', () => {
    render(<MaterialCard.Skeleton />);
    expect(screen.getByTestId('material-card-skeleton')).toBeInTheDocument();
  });
});
