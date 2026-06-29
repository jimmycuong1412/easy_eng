import { act } from 'react';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';

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

  // Regression: MaterialBody is rendered as the first child of the 'use client'
  // material players (Dialogue/Grammar/Reading), immediately followed by section
  // content and a completion button. A hydration mismatch inside MaterialBody made
  // React discard every sibling after <article>, so the section content and the
  // "mark done" button vanished from the live DOM after hydration. The SSR output
  // and the client render must be byte-identical so siblings survive hydration.
  describe('hydration stability (server == client)', () => {
    // The real material bodies that exposed the bug: dialogue (real newlines),
    // reading (literal backslash-n seed data), grammar (inline bold + italic).
    const bodies: Record<string, string> = {
      dialogue: '# Gọi món ở quán phở\n\nTình huống: Một du khách bước vào quán phở.',
      reading: '# Giao thông Hà Nội\\n\\nMillions of motorbikes fill the streets.',
      grammar: '# Động từ to be\n\nĐộng từ *to be* quan trọng. Có: **am**, **is**, **are**.',
    };

    // Mirrors the player layout: <MaterialBody/> followed by a sibling that must
    // survive hydration (stands in for DialogueLines + the completion button).
    function Player({ body }: { body: string }) {
      const material = { body_vi: body, body_en: null } as MaterialDetail;
      return (
        <div>
          <MaterialBody material={material} locale="vi" />
          <p data-testid="sibling-after-body">completion block</p>
        </div>
      );
    }

    it.each(Object.entries(bodies))(
      'hydrates %s body with no mismatch and keeps the sibling after <article>',
      async (_name, body) => {
        const ssr = renderToString(<Player body={body} />);
        expect(ssr).toContain('data-testid="sibling-after-body"');

        const container = document.createElement('div');
        container.innerHTML = ssr;
        document.body.appendChild(container);

        const errors: unknown[] = [];
        const origError = console.error;
        console.error = (...args: unknown[]) => {
          errors.push(args);
        };

        let root: ReturnType<typeof hydrateRoot> | undefined;
        try {
          await act(async () => {
            root = hydrateRoot(container, <Player body={body} />);
          });
        } finally {
          console.error = origError;
        }

        // No hydration warnings ("Expected server HTML to contain a matching ...").
        expect(errors).toEqual([]);
        // The sibling after <article> must still be in the DOM.
        expect(container.querySelector('[data-testid="sibling-after-body"]')).not.toBeNull();
        expect(container.querySelector('article.ed-prose')).not.toBeNull();

        act(() => {
          root?.unmount();
        });
        container.remove();
      },
    );
  });
});
