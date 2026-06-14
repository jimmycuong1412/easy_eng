'use client';

/**
 * PronunciationPractice (Growth 3.3 — free AI speaking)
 *
 * Uses the browser's Web Speech API (free, on-device) to let a learner read a
 * target sentence aloud and get an instant similarity score. No server, no API
 * cost. Falls back gracefully where SpeechRecognition is unavailable.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2, RotateCcw } from 'lucide-react';

interface Props {
  text: string; // the target sentence to read
  lang?: string; // BCP-47, default en-US
}

const normWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const tokenize = (s: string) => s.split(/\s+/).map(normWord).filter(Boolean);

// Character-level Levenshtein (for fuzzy per-word match — handles small ASR slips)
function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1]
        : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    }
    prev = cur;
  }
  return prev[n];
}
const wordClose = (a: string, b: string) => {
  if (a === b) return true;
  const d = lev(a, b);
  return d <= Math.max(1, Math.floor(Math.max(a.length, b.length) * 0.2)); // ~80% similar
};

interface WordEval { word: string; ok: boolean }

// Word-level alignment (LCS-style) → per-word correctness + overall score.
// More accurate & actionable than raw string distance: shows which words to fix.
function evaluate(target: string, spoken: string): { score: number; words: WordEval[] } {
  const t = tokenize(target);
  const s = tokenize(spoken);
  if (t.length === 0) return { score: 0, words: [] };

  // LCS with fuzzy equality to know which target words were matched, in order.
  const m = t.length, n = s.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = wordClose(t[i - 1], s[j - 1])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);

  // backtrack to flag matched target words
  const matched = new Array(m).fill(false);
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (wordClose(t[i - 1], s[j - 1])) { matched[i - 1] = true; i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--;
  }
  const correct = matched.filter(Boolean).length;
  return {
    score: Math.round((correct / m) * 100),
    words: t.map((w, k) => ({ word: target.split(/\s+/)[k] ?? w, ok: matched[k] })),
  };
}

export default function PronunciationPractice({ text, lang = 'en-US' }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [wordEval, setWordEval] = useState<WordEval[]>([]);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (typeof window !== 'undefined') &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    setSupported(!!SR);
  }, []);

  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  };

  const start = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript as string;
      setHeard(transcript);
      const { score: sc, words } = evaluate(text, transcript);
      setScore(sc);
      setWordEval(words);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setHeard(''); setScore(null); setWordEval([]); setListening(true);
    rec.start();
  };

  const stop = () => { try { recRef.current?.stop(); } catch { /* ignore */ } setListening(false); };

  const reset = () => { setHeard(''); setScore(null); setWordEval([]); };

  if (!supported) return null;

  const band = score == null ? '' : score >= 85 ? 'Tuyệt vời! 🎉' : score >= 65 ? 'Khá tốt 👍' : 'Thử lại nhé 💪';
  const color = score == null ? 'var(--et-fg-2)' : score >= 85 ? '#22c55e' : score >= 65 ? 'var(--et-coral)' : '#ef4444';

  return (
    <div className="mt-4 rounded-xl p-4" style={{ background: 'var(--et-bg-3)', border: '1px solid var(--et-line)' }}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold" style={{ color: 'var(--et-fg)' }}>🎤 Luyện đọc to</span>
        <button onClick={speak} title="Nghe mẫu"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs"
                style={{ background: 'var(--et-bg-2)', color: 'var(--et-fg-2)' }}>
          <Volume2 className="h-3.5 w-3.5" /> Nghe mẫu
        </button>
      </div>

      <p className="mt-3 text-sm" style={{ color: 'var(--et-fg-2)' }}>
        {wordEval.length > 0 ? (
          wordEval.map((w, i) => (
            <span key={i} style={{ color: w.ok ? '#22c55e' : '#ef4444', fontWeight: w.ok ? 400 : 600 }}>
              {w.word}{i < wordEval.length - 1 ? ' ' : ''}
            </span>
          ))
        ) : text}
      </p>

      <div className="mt-3 flex items-center gap-2">
        {!listening ? (
          <button onClick={start} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white" style={{ background: 'var(--et-coral)' }}>
            <Mic className="h-4 w-4" /> Bắt đầu đọc
          </button>
        ) : (
          <button onClick={stop} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white" style={{ background: '#ef4444' }}>
            <Square className="h-4 w-4" /> Dừng
          </button>
        )}
        {score != null && (
          <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm" style={{ background: 'var(--et-bg-2)', color: 'var(--et-fg-2)' }}>
            <RotateCcw className="h-4 w-4" /> Làm lại
          </button>
        )}
      </div>

      {heard && (
        <div className="mt-3 text-sm">
          <p style={{ color: 'var(--et-fg-2)' }}>Bạn đọc: <span style={{ color: 'var(--et-fg)' }}>“{heard}”</span></p>
          <p className="mt-1 font-semibold" style={{ color }}>Độ chính xác: {score}% — {band}</p>
          {wordEval.some((w) => !w.ok) && (
            <p className="mt-1 text-xs" style={{ color: 'var(--et-fg-2)' }}>
              Cần luyện thêm: {wordEval.filter((w) => !w.ok).map((w) => w.word).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
