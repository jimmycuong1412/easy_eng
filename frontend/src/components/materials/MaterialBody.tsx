/**
 * <MaterialBody>
 *
 * Renders the Markdown `body_vi` / `body_en` of a material with locale fallback.
 *
 * The seed catalog uses a small Markdown subset (#/##/### headings, bold,
 * paragraphs, lists, code blocks). To avoid pulling react-markdown +
 * remark-gfm (~120 KB gzipped) into every detail page, we ship a focused
 * parser tuned to that subset. Authors who need richer Markdown can extend
 * this file in a follow-up — this is sized for the v1 catalog.
 *
 * Locale fallback rule (research.md R10): on `en`, fall back to `body_vi`
 * with a "translation pending" eyebrow.
 */

import { useTranslations } from 'next-intl';

import { resolveBody, type MaterialDetail } from '@/lib/queries/materials';

import type { Locale } from './MaterialCard';

export interface MaterialBodyProps {
  material: Pick<MaterialDetail, 'body_vi' | 'body_en'>;
  locale: Locale;
  className?: string;
}

export function MaterialBody({ material, locale, className = '' }: MaterialBodyProps) {
  const t = useTranslations();
  const { body, fallbackUsed } = resolveBody(material, locale);

  return (
    <article
      className={`ed-prose max-w-prose ${className}`}
      style={{ fontFamily: 'var(--font-geist-sans, var(--font-inter, sans-serif))' }}
    >
      {fallbackUsed && (
        <span
          data-testid="translation-pending-eyebrow"
          className="ed-eyebrow mb-3 inline-block text-[10px] text-[color:var(--ed-coral-ink,#7A2010)]"
        >
          {t('materials.detail.translationPending')}
        </span>
      )}
      <MarkdownTree source={body} />
    </article>
  );
}

// ============================================================
// Lightweight Markdown → React parser
// ============================================================

interface ListBlock {
  kind: 'ul' | 'ol';
  items: string[];
}

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'code'; language: string | null; content: string }
  | (ListBlock & { kind: 'ul' | 'ol' });

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Code fence
    if (line.startsWith('```')) {
      const language = line.slice(3).trim() || null;
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ kind: 'code', language, content: buf.join('\n') });
      continue;
    }

    // Heading
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      blocks.push({
        kind: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }

    // Paragraph: gather consecutive non-blank, non-special lines
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^[-*]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !lines[i].startsWith('```')
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ kind: 'paragraph', text: buf.join(' ') });
  }

  return blocks;
}

/** Render inline `**bold**` + `_italic_` markers. */
function renderInline(text: string, keyPrefix = ''): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match **bold** or _italic_ (non-greedy)
  const regex = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let counter = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[1];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`${keyPrefix}-b-${counter}`}>{token.slice(2, -2)}</strong>,
      );
    } else if (token.startsWith('_') && token.endsWith('_')) {
      parts.push(<em key={`${keyPrefix}-i-${counter}`}>{token.slice(1, -1)}</em>);
    }
    counter++;
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function MarkdownTree({ source }: { source: string }) {
  const blocks = parseBlocks(source);

  return (
    <>
      {blocks.map((block, idx) => {
        switch (block.kind) {
          case 'heading': {
            const Tag = (`h${block.level}` as 'h1' | 'h2' | 'h3');
            const sizes = { 1: 'text-3xl', 2: 'text-2xl', 3: 'text-xl' } as const;
            return (
              <Tag
                key={idx}
                className={`mt-6 font-serif ${sizes[block.level]} text-[color:var(--ed-ink-2,#0A1F4F)]`}
                style={{ fontFamily: 'var(--font-newsreader, serif)' }}
              >
                {renderInline(block.text, `h-${idx}`)}
              </Tag>
            );
          }
          case 'paragraph':
            return (
              <p key={idx} className="mt-3 leading-relaxed text-[color:var(--ed-ink,#0B2A6B)]">
                {renderInline(block.text, `p-${idx}`)}
              </p>
            );
          case 'ul':
            return (
              <ul key={idx} className="mt-3 list-disc space-y-1 pl-6 text-[color:var(--ed-ink,#0B2A6B)]">
                {block.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `ul-${idx}-${j}`)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx} className="mt-3 list-decimal space-y-1 pl-6 text-[color:var(--ed-ink,#0B2A6B)]">
                {block.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `ol-${idx}-${j}`)}</li>
                ))}
              </ol>
            );
          case 'code':
            return (
              <pre
                key={idx}
                className="mt-4 overflow-x-auto rounded-md p-3 text-sm"
                style={{
                  background: 'var(--ed-ink, #0B2A6B)',
                  color: '#F4EFE2',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                <code>{block.content}</code>
              </pre>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
