'use client';

/**
 * /[locale]/ai-tools — Công cụ AI học tiếng Anh miễn phí.
 * Tất cả chạy local trong browser — không server, không API key, không chi phí.
 *
 * Tính năng:
 *  1. Grammar Checker (rule-based ESL engine)
 *  2. Pronunciation Feedback (Web Speech API + waveform)
 */

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Sparkles, Mic2, PenLine } from 'lucide-react';

const GrammarChecker = dynamic(() => import('@/components/ai/GrammarChecker'), { ssr: false });
const PronunciationPractice = dynamic(
  () => import('@/components/materials/PronunciationPractice'),
  { ssr: false },
);

const SAMPLE_SENTENCES = [
  'She go to school everyday and learn many things.',
  'I have discuss about the problem with my friend yesterday.',
  'He can to speak English very well.',
  'They arrive to the airport at 8 AM.',
  'I want to open the light because its dark.',
  'According to me, this movie is more better than the last one.',
];

const PRONUNCIATION_SAMPLES = [
  'The weather is beautiful today.',
  'Could you please repeat that more slowly?',
  'I would like to practice my pronunciation.',
  'She sells seashells by the seashore.',
  'How much wood would a woodchuck chuck?',
];

type Tab = 'grammar' | 'pronunciation';

export default function AIToolsPage() {
  const [tab, setTab] = useState<Tab>('grammar');
  const [pronText, setPronText] = useState(PRONUNCIATION_SAMPLES[0]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: 'var(--et-coral)' }} />
          <h1 className="text-xl font-bold" style={{ color: 'var(--et-fg)' }}>
            Công cụ AI học tiếng Anh
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--et-fg-2)' }}>
          Chạy hoàn toàn trên máy bạn — miễn phí, không cần kết nối internet.
        </p>
      </div>

      <a
        href="/vi/shadowing"
        className="block rounded-xl p-4"
        style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--et-fg)' }}>
          🎧 Luyện nói theo người bản xứ
        </span>
        <p className="mt-1 text-xs" style={{ color: 'var(--et-fg-2)' }}>
          Chấm điểm cả từ vựng và nhịp điệu — miễn phí, không cần đăng ký.
        </p>
      </a>

      {/* Tab switcher */}
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: 'var(--et-bg-2)' }}
      >
        {([
          { id: 'grammar', label: 'Kiểm tra ngữ pháp', Icon: PenLine },
          { id: 'pronunciation', label: 'Luyện phát âm', Icon: Mic2 },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
            style={
              tab === id
                ? { background: 'var(--et-bg)', color: 'var(--et-fg)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                : { color: 'var(--et-fg-2)' }
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Grammar tab */}
      {tab === 'grammar' && (
        <div className="space-y-4">
          <GrammarChecker
            placeholder="Viết câu tiếng Anh của bạn... Ví dụ: She go to school everyday."
            minHeight={160}
          />

          {/* Sample sentences */}
          <div>
            <p className="mb-2 text-xs font-medium" style={{ color: 'var(--et-fg-2)' }}>
              Thử với câu mẫu (có lỗi cố ý):
            </p>
            <div className="flex flex-col gap-1.5">
              {SAMPLE_SENTENCES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    // Trigger GrammarChecker via re-mounting with initialText won't work
                    // — user copies to clipboard instead
                    navigator.clipboard?.writeText(s).catch(() => {});
                    // Set to input via data attr trick: just show as copyable
                  }}
                  className="text-left rounded-lg px-3 py-2 text-xs transition-colors"
                  style={{ background: 'var(--et-bg-2)', color: 'var(--et-fg-2)' }}
                  title="Click để sao chép"
                >
                  "{s}"
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px]" style={{ color: 'var(--et-fg-2)' }}>
              Click vào câu để sao chép → dán vào ô kiểm tra ở trên.
            </p>
          </div>
        </div>
      )}

      {/* Pronunciation tab */}
      {tab === 'pronunciation' && (
        <div className="space-y-4">
          {/* Sentence selector */}
          <div>
            <p className="mb-2 text-xs font-medium" style={{ color: 'var(--et-fg-2)' }}>
              Chọn câu luyện phát âm:
            </p>
            <div className="flex flex-col gap-1.5">
              {PRONUNCIATION_SAMPLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setPronText(s)}
                  className="text-left rounded-lg px-3 py-2 text-xs transition-all"
                  style={
                    pronText === s
                      ? { background: 'var(--et-coral)', color: '#fff' }
                      : { background: 'var(--et-bg-2)', color: 'var(--et-fg-2)' }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Custom input */}
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--et-fg-2)' }}>
              Hoặc nhập câu của bạn:
            </label>
            <input
              type="text"
              value={pronText}
              onChange={(e) => setPronText(e.target.value)}
              placeholder="Nhập câu tiếng Anh bất kỳ..."
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: 'var(--et-line)',
                background: 'var(--et-bg)',
                color: 'var(--et-fg)',
              }}
            />
          </div>

          {/* Practice component */}
          {pronText.trim() && (
            <PronunciationPractice key={pronText} text={pronText} lang="en-US" />
          )}
        </div>
      )}

      {/* Info footer */}
      <p className="text-center text-[11px]" style={{ color: 'var(--et-fg-2)' }}>
        🔒 Không có dữ liệu nào được gửi lên server — tất cả xử lý ngay trên thiết bị của bạn.
      </p>
    </div>
  );
}
