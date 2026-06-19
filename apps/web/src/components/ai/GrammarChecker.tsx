'use client';

/**
 * GrammarChecker — AI local, zero network, zero cost.
 * Dùng rule-based engine từ lib/grammar/rules.ts.
 * Tích hợp vào bất kỳ trang nào cần luyện viết.
 */

import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, Lightbulb, X } from 'lucide-react';
import { checkGrammar, type GrammarIssue } from '@/lib/grammar/rules';

interface Props {
  placeholder?: string;
  initialText?: string;
  minHeight?: number;
}

const SEVERITY_CONFIG = {
  error: {
    icon: AlertCircle,
    bg: 'rgba(239,68,68,0.08)',
    border: '#ef4444',
    label: 'Lỗi',
    dot: '#ef4444',
  },
  warning: {
    icon: Lightbulb,
    bg: 'rgba(245,158,11,0.08)',
    border: '#f59e0b',
    label: 'Lưu ý',
    dot: '#f59e0b',
  },
  info: {
    icon: Info,
    bg: 'rgba(99,102,241,0.08)',
    border: '#6366f1',
    label: 'Gợi ý',
    dot: '#6366f1',
  },
} as const;

function HighlightedText({ text, issues }: { text: string; issues: GrammarIssue[] }) {
  if (!issues.length) return <>{text}</>;

  const segments: React.ReactNode[] = [];
  let cursor = 0;

  for (const issue of issues) {
    if (issue.start > cursor) {
      segments.push(<span key={`t-${cursor}`}>{text.slice(cursor, issue.start)}</span>);
    }
    const cfg = SEVERITY_CONFIG[issue.severity];
    segments.push(
      <mark
        key={`m-${issue.start}`}
        title={issue.message}
        style={{
          background: cfg.bg,
          borderBottom: `2px ${issue.severity === 'error' ? 'solid' : 'dashed'} ${cfg.border}`,
          borderRadius: 2,
          color: 'inherit',
          cursor: 'help',
        }}
      >
        {text.slice(issue.start, issue.end)}
      </mark>,
    );
    cursor = issue.end;
  }
  if (cursor < text.length) segments.push(<span key={`t-end`}>{text.slice(cursor)}</span>);
  return <>{segments}</>;
}

export default function GrammarChecker({
  placeholder = 'Viết câu tiếng Anh của bạn vào đây...',
  initialText = '',
  minHeight = 140,
}: Props) {
  const [text, setText] = useState(initialText);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Defer grammar check so typing stays snappy
  const deferred = useDeferredValue(text);
  const allIssues = useMemo(() => checkGrammar(deferred), [deferred]);
  const issues = useMemo(
    () => allIssues.filter((iss) => !dismissed.has(`${iss.start}-${iss.end}`)),
    [allIssues, dismissed],
  );

  const applySuggestion = useCallback(
    (issue: GrammarIssue) => {
      setText((prev) => prev.slice(0, issue.start) + issue.suggestion + prev.slice(issue.end));
      setActiveIdx(null);
    },
    [],
  );

  const dismissIssue = useCallback((issue: GrammarIssue) => {
    setDismissed((prev) => new Set(prev).add(`${issue.start}-${issue.end}`));
    setActiveIdx(null);
  }, []);

  const clearAll = () => {
    setText('');
    setActiveIdx(null);
    setDismissed(new Set());
  };

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--et-line)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: 'var(--et-bg-2)', borderBottom: '1px solid var(--et-line)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--et-fg)' }}>
            ✍️ Kiểm tra ngữ pháp (AI local)
          </span>
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}
          >
            miễn phí
          </span>
        </div>
        {text && (
          <button
            onClick={clearAll}
            className="text-xs"
            style={{ color: 'var(--et-fg-2)' }}
          >
            Xóa
          </button>
        )}
      </div>

      {/* Textarea overlay stack */}
      <div className="relative" style={{ background: 'var(--et-bg)' }}>
        {/* Highlight layer (behind textarea) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 whitespace-pre-wrap break-words p-3 text-sm"
          style={{
            fontFamily: 'inherit',
            lineHeight: '1.6',
            color: 'transparent',
            minHeight,
          }}
        >
          <HighlightedText text={text || ' '} issues={issues} />
        </div>

        {/* Actual textarea */}
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActiveIdx(null);
            setDismissed(new Set());
          }}
          placeholder={placeholder}
          className="relative w-full resize-none bg-transparent p-3 text-sm outline-none"
          style={{
            fontFamily: 'inherit',
            lineHeight: '1.6',
            minHeight,
            color: 'var(--et-fg)',
            caretColor: 'var(--et-coral)',
          }}
          spellCheck={false}
        />
      </div>

      {/* Status bar */}
      {text.trim() && (
        <div
          className="flex items-center gap-3 px-4 py-2 text-xs"
          style={{ background: 'var(--et-bg-2)', borderTop: '1px solid var(--et-line)' }}
        >
          {issues.length === 0 ? (
            <span className="flex items-center gap-1.5" style={{ color: '#16a34a' }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Không tìm thấy lỗi
            </span>
          ) : (
            <>
              {errors > 0 && (
                <span className="flex items-center gap-1" style={{ color: '#ef4444' }}>
                  <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                  {errors} lỗi
                </span>
              )}
              {warnings > 0 && (
                <span className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
                  <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
                  {warnings} lưu ý
                </span>
              )}
            </>
          )}
          <span className="ml-auto" style={{ color: 'var(--et-fg-2)' }}>
            {text.length} ký tự
          </span>
        </div>
      )}

      {/* Issues panel */}
      {issues.length > 0 && (
        <ul
          className="divide-y"
          style={{
            borderTop: '1px solid var(--et-line)',
            '--divide-color': 'var(--et-line)',
          } as React.CSSProperties}
        >
          {issues.map((iss, idx) => {
            const cfg = SEVERITY_CONFIG[iss.severity];
            const Icon = cfg.icon;
            const active = activeIdx === idx;
            return (
              <li
                key={`${iss.start}-${iss.end}`}
                className="px-4 py-3"
                style={{ background: active ? cfg.bg : 'var(--et-bg)' }}
              >
                <button
                  className="w-full text-left"
                  onClick={() => setActiveIdx(active ? null : idx)}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: cfg.border }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: 'var(--et-fg)' }}>
                        {iss.message}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-mono" style={{ color: 'var(--et-fg-2)' }}>
                        "…{text.slice(Math.max(0, iss.start - 5), iss.end + 5)}…"
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ background: cfg.bg, color: cfg.border }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                </button>

                {active && (
                  <div className="mt-2 ml-6.5 flex items-center gap-2">
                    {iss.suggestion !== iss.message && (
                      <button
                        onClick={() => applySuggestion(iss)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                        style={{ background: 'var(--et-coral)' }}
                      >
                        Sửa → "{iss.suggestion}"
                      </button>
                    )}
                    <button
                      onClick={() => dismissIssue(iss)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs"
                      style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg-2)' }}
                    >
                      <X className="h-3 w-3" /> Bỏ qua
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
