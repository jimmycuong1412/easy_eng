/**
 * renderInline — render inline `**bold**` + `_italic_` markers to React nodes.
 *
 * Extracted into its own module (no next-intl / no hooks / no 'use client')
 * so both <MaterialBody> and the section components (grammar/dialogue/reading)
 * can share inline formatting. Importing it from MaterialBody would drag that
 * component's next-intl dependency into consumers' Jest suites.
 */

import * as React from 'react';

export function renderInline(text: string, keyPrefix = ''): React.ReactNode[] {
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
