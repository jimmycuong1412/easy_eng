'use client';

/**
 * PronunciationPractice — AI local, dùng Web Speech API + Web Audio API.
 *
 * Tính năng:
 * - Nghe mẫu (TTS)
 * - Thu âm + nhận dạng giọng nói (SpeechRecognition)
 * - Waveform visualizer realtime
 * - Đánh giá từng từ (LCS + Levenshtein)
 * - Lịch sử 5 lần thử gần nhất
 * - Tự động đánh dấu từ cần luyện thêm
 *
 * Zero network, zero cost — chạy hoàn toàn trên máy người dùng.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  text: string;
  lang?: string;
}

// ─── Scoring engine ──────────────────────────────────────────────────────────

const normWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const tokenize = (s: string) => s.split(/\s+/).map(normWord).filter(Boolean);

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

const wordClose = (a: string, b: string) =>
  a === b || lev(a, b) <= Math.max(1, Math.floor(Math.max(a.length, b.length) * 0.2));

interface WordEval { word: string; ok: boolean }

function evaluate(target: string, spoken: string): { score: number; words: WordEval[] } {
  const t = tokenize(target);
  const s = tokenize(spoken);
  if (!t.length) return { score: 0, words: [] };

  const m = t.length, n = s.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = wordClose(t[i - 1], s[j - 1])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);

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

// ─── Waveform ────────────────────────────────────────────────────────────────

function WaveformBar({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      // Clear canvas
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      return;
    }

    let audioCtx: AudioContext;

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      streamRef.current = stream;
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const draw = () => {
        animRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(data);
        const ctx2d = canvas.getContext('2d');
        if (!ctx2d) return;

        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        const barW = canvas.width / data.length * 2.5;
        let x = 0;
        for (let k = 0; k < data.length; k++) {
          const barH = (data[k] / 255) * canvas.height;
          const alpha = 0.4 + (data[k] / 255) * 0.6;
          ctx2d.fillStyle = `rgba(244,89,58,${alpha})`;
          ctx2d.fillRect(x, canvas.height - barH, barW - 1, barH);
          x += barW;
        }
      };
      draw();
    }).catch(() => {/* mic denied — waveform just stays blank */});

    return () => {
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtx?.close();
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={36}
      className="rounded"
      style={{ background: 'var(--et-bg-3)', width: '100%', maxWidth: 280 }}
    />
  );
}

// ─── Score badge ─────────────────────────────────────────────────────────────

interface AttemptRecord { score: number; heard: string; ts: number }

function ScoreBadge({ score }: { score: number }) {
  const [color, label] =
    score >= 85 ? ['#22c55e', 'Tuyệt vời! 🎉']
    : score >= 65 ? ['var(--et-coral)', 'Khá tốt 👍']
    : ['#ef4444', 'Thử lại nhé 💪'];
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-bold tabular-nums" style={{ color }}>{score}%</span>
      <span className="text-sm" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const MAX_HISTORY = 5;

export default function PronunciationPractice({ text, lang = 'en-US' }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [wordEval, setWordEval] = useState<WordEval[]>([]);
  const [history, setHistory] = useState<AttemptRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    setSupported(!!SR);
  }, []);

  const speak = useCallback(() => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }, [text, lang]);

  const start = useCallback(() => {
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
      setHistory((prev) => [
        { score: sc, heard: transcript, ts: Date.now() },
        ...prev,
      ].slice(0, MAX_HISTORY));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setHeard(''); setScore(null); setWordEval([]);
    setListening(true);
    rec.start();
  }, [text, lang]);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setHeard(''); setScore(null); setWordEval([]);
  }, []);

  if (!supported) return null;

  const weakWords = wordEval.filter((w) => !w.ok).map((w) => w.word);

  return (
    <div
      className="mt-4 space-y-3 rounded-xl p-4"
      style={{ background: 'var(--et-bg-3)', border: '1px solid var(--et-line)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold" style={{ color: 'var(--et-fg)' }}>
          🎤 Luyện phát âm (AI local)
        </span>
        <button
          onClick={speak}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs"
          style={{ background: 'var(--et-bg-2)', color: 'var(--et-fg-2)' }}
        >
          <Volume2 className="h-3.5 w-3.5" /> Nghe mẫu
        </button>
      </div>

      {/* Target text with per-word coloring after attempt */}
      <p className="text-sm leading-relaxed" style={{ color: 'var(--et-fg-2)' }}>
        {wordEval.length > 0
          ? wordEval.map((w, i) => (
              <span
                key={i}
                style={{ color: w.ok ? '#22c55e' : '#ef4444', fontWeight: w.ok ? 400 : 600 }}
              >
                {w.word}{i < wordEval.length - 1 ? ' ' : ''}
              </span>
            ))
          : text}
      </p>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        {!listening ? (
          <button
            onClick={start}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--et-coral)' }}
          >
            <Mic className="h-4 w-4" /> Bắt đầu đọc
          </button>
        ) : (
          <button
            onClick={stop}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white"
            style={{ background: '#ef4444' }}
          >
            <Square className="h-4 w-4" /> Dừng
          </button>
        )}
        {score !== null && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm"
            style={{ background: 'var(--et-bg-2)', color: 'var(--et-fg-2)' }}
          >
            <RotateCcw className="h-4 w-4" /> Làm lại
          </button>
        )}
        {/* Waveform */}
        {listening && (
          <div className="flex-1 min-w-0">
            <WaveformBar active={listening} />
          </div>
        )}
      </div>

      {/* Result */}
      {heard && score !== null && (
        <div
          className="space-y-2 rounded-lg p-3"
          style={{ background: 'var(--et-bg-2)' }}
        >
          <p className="text-xs" style={{ color: 'var(--et-fg-2)' }}>
            Bạn đọc: <span style={{ color: 'var(--et-fg)' }}>"{heard}"</span>
          </p>
          <ScoreBadge score={score} />
          {weakWords.length > 0 && (
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--et-fg-2)' }}>
                Cần luyện thêm:
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {weakWords.map((w) => (
                  <span
                    key={w}
                    className="rounded px-2 py-0.5 text-xs font-medium"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--et-fg-2)' }}
          >
            {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Lịch sử ({history.length} lần thử)
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {history.map((h, idx) => (
                <div
                  key={h.ts}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                  style={{ background: 'var(--et-bg-2)' }}
                >
                  <span style={{ color: 'var(--et-fg-2)' }}>
                    Lần {history.length - idx}: "{h.heard.slice(0, 40)}{h.heard.length > 40 ? '…' : ''}"
                  </span>
                  <span
                    className="font-bold tabular-nums ml-3 shrink-0"
                    style={{ color: h.score >= 85 ? '#22c55e' : h.score >= 65 ? 'var(--et-coral)' : '#ef4444' }}
                  >
                    {h.score}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
