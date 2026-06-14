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

// Levenshtein-based similarity (0–100) between two normalized strings.
function similarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[.,!?;:"'`()\[\]{}\-_/\\]/g, '').replace(/\s+/g, ' ').trim();
  const s1 = norm(a), s2 = norm(b);
  if (!s1 || !s2) return 0;
  const m = s1.length, n = s2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = s1[i - 1] === s2[j - 1] ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  const dist = dp[m][n];
  return Math.max(0, Math.round((1 - dist / Math.max(m, n)) * 100));
}

export default function PronunciationPractice({ text, lang = 'en-US' }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [score, setScore] = useState<number | null>(null);
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
      setScore(similarity(text, transcript));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setHeard(''); setScore(null); setListening(true);
    rec.start();
  };

  const stop = () => { try { recRef.current?.stop(); } catch { /* ignore */ } setListening(false); };

  const reset = () => { setHeard(''); setScore(null); };

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

      <p className="mt-3 text-sm" style={{ color: 'var(--et-fg-2)' }}>{text}</p>

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
        </div>
      )}
    </div>
  );
}
