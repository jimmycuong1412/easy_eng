import { render, screen } from '@testing-library/react';

import { MaterialBody } from '@/components/materials/MaterialBody';
import type { MaterialDetail } from '@/lib/queries/materials';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const baseMaterial: Partial<MaterialDetail> = {
  body_vi: '# Tiêu đề\n\nĐây là nội dung **tiếng Việt**.',
  body_en: '# Title\n\nThis is **English** content.',
};

describe('<MaterialBody>', () => {
  it('renders the Vietnamese body when locale=vi', () => {
    render(<MaterialBody material={baseMaterial as MaterialDetail} locale="vi" />);
    expect(screen.getByText('Tiêu đề')).toBeInTheDocument();
    expect(screen.getByText(/Đây là nội dung/)).toBeInTheDocument();
  });

  it('renders the English body when locale=en and body_en is present', () => {
    render(<MaterialBody material={baseMaterial as MaterialDetail} locale="en" />);
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText(/English/)).toBeInTheDocument();
  });

  it('falls back to Vietnamese body and shows the translation-pending eyebrow on en', () => {
    const material = { ...baseMaterial, body_en: null } as MaterialDetail;
    render(<MaterialBody material={material} locale="en" />);
    expect(screen.getByText('Tiêu đề')).toBeInTheDocument();
    expect(screen.getByTestId('translation-pending-eyebrow')).toBeInTheDocument();
  });

  it('does NOT show the translation-pending eyebrow on the Vietnamese locale', () => {
    render(<MaterialBody material={baseMaterial as MaterialDetail} locale="vi" />);
    expect(screen.queryByTestId('translation-pending-eyebrow')).toBeNull();
  });

  it('renders bold inline formatting', () => {
    render(<MaterialBody material={baseMaterial as MaterialDetail} locale="vi" />);
    const strong = screen.getByText('tiếng Việt');
    expect(strong.tagName.toLowerCase()).toBe('strong');
  });

  it('renders body_vi that contains literal backslash-n (SQL seed data)', () => {
    // SQL strings without E'' prefix store literal \n instead of real newlines.
    // The parser must unescape them so headings and paragraphs render correctly.
    const material: Partial<MaterialDetail> = {
      body_vi: '# Chào hỏi cơ bản\\n\\nĐây là nội dung.',
      body_en: null,
    };
    render(<MaterialBody material={material as MaterialDetail} locale="vi" />);
    expect(screen.getByText('Chào hỏi cơ bản')).toBeInTheDocument();
    expect(screen.getByText(/Đây là nội dung/)).toBeInTheDocument();
  });

  it('renders ordered and unordered lists', () => {
    const material: Partial<MaterialDetail> = {
      body_vi: '## Danh sách\n\n- Mục 1\n- Mục 2\n\n1. Bước 1\n2. Bước 2',
      body_en: null,
    };
    render(<MaterialBody material={material as MaterialDetail} locale="vi" />);
    expect(screen.getByText('Mục 1')).toBeInTheDocument();
    expect(screen.getByText('Bước 1')).toBeInTheDocument();
  });
});
