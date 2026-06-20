'use client';

import { useState } from 'react';
import { RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SavedWord } from '@easyeng/core';

interface FlashcardSessionProps {
  words: SavedWord[];
  onReview: (vocabularyItemId: string, result: 'good' | 'hard' | 'again') => Promise<void>;
  onDone: () => void;
}

export function FlashcardSession({ words, onReview, onDone }: FlashcardSessionProps) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<Record<string, 'good' | 'hard' | 'again'>>({});
  const [busy, setBusy] = useState(false);

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-4xl">🎉</span>
        <p className="text-sm font-semibold" style={{ color: 'var(--et-fg)' }}>Không có từ nào cần ôn hôm nay!</p>
        <button onClick={onDone} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ background: 'var(--et-coral)', color: '#fff' }}>
          Quay lại
        </button>
      </div>
    );
  }

  if (done) {
    const good = Object.values(results).filter((r) => r === 'good').length;
    const hard = Object.values(results).filter((r) => r === 'hard').length;
    const again = Object.values(results).filter((r) => r === 'again').length;
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <span className="text-5xl">{good >= words.length * 0.8 ? '🏆' : '📚'}</span>
        <h2 className="text-xl font-bold" style={{ color: 'var(--et-fg)' }}>Xong rồi!</h2>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5"><span className="text-green-400 font-bold">{good}</span> Thuộc</span>
          <span className="flex items-center gap-1.5"><span className="text-yellow-400 font-bold">{hard}</span> Khó</span>
          <span className="flex items-center gap-1.5"><span className="text-red-400 font-bold">{again}</span> Chưa thuộc</span>
        </div>
        <button onClick={onDone} className="rounded-lg px-5 py-2 text-sm font-medium mt-2" style={{ background: 'var(--et-coral)', color: '#fff' }}>
          Hoàn thành
        </button>
      </div>
    );
  }

  const word = words[idx];

  const handleResult = async (result: 'good' | 'hard' | 'again') => {
    setBusy(true);
    setResults((r) => ({ ...r, [word.vocabulary_item_id]: result }));
    await onReview(word.vocabulary_item_id, result);
    setBusy(false);
    if (idx + 1 >= words.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setFlipped(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--et-bg-3)' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.round((idx / words.length) * 100)}%`, background: 'var(--et-coral)' }} />
        </div>
        <span className="text-[11px]" style={{ color: 'var(--et-fg-2)' }}>{idx + 1}/{words.length}</span>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped((f) => !f)}
        className="cursor-pointer rounded-2xl p-6 min-h-[200px] flex flex-col items-center justify-center gap-3 select-none transition-all"
        style={{ background: 'var(--et-bg-2)', border: '2px solid var(--et-line)' }}
      >
        {!flipped ? (
          <>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--et-fg-2)' }}>Từ tiếng Anh — nhấn để lật</p>
            <p className="text-3xl font-bold text-center" style={{ color: 'var(--et-fg)', fontFamily: 'var(--font-newsreader, serif)' }}>
              {word.term}
            </p>
            {word.ipa && <p className="text-sm font-mono" style={{ color: 'var(--et-fg-2)' }}>{word.ipa}</p>}
            {word.pos && <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg-2)' }}>{word.pos}</span>}
          </>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--et-fg-2)' }}>Nghĩa tiếng Việt</p>
            <p className="text-xl font-semibold text-center" style={{ color: 'var(--et-fg)' }}>{word.gloss_vi}</p>
            {word.vi_phonetic_hint && (
              <p className="text-sm italic" style={{ color: 'var(--et-coral)' }}>"{word.vi_phonetic_hint}"</p>
            )}
            {word.example_en && (
              <p className="text-sm text-center mt-1 italic" style={{ color: 'var(--et-fg-2)' }}>{word.example_en}</p>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      {flipped ? (
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleResult('again')}
            disabled={busy}
            className="rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            🔄 Học lại
          </button>
          <button
            onClick={() => handleResult('hard')}
            disabled={busy}
            className="rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
          >
            😓 Khó
          </button>
          <button
            onClick={() => handleResult('good')}
            disabled={busy}
            className="rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
          >
            ✅ Thuộc
          </button>
        </div>
      ) : (
        <p className="text-center text-[11px]" style={{ color: 'var(--et-fg-2)' }}>
          Nhấn vào thẻ để xem nghĩa
        </p>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setIdx((i) => Math.max(0, i - 1)); setFlipped(false); }}
          disabled={idx === 0}
          className="flex items-center gap-1 text-[11px] disabled:opacity-30"
          style={{ color: 'var(--et-fg-2)' }}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Trước
        </button>
        <button onClick={() => { setFlipped(false); }} className="text-[11px]" style={{ color: 'var(--et-fg-2)' }}>
          <RotateCcw className="h-3.5 w-3.5 inline mr-1" />Lật lại
        </button>
        <button
          onClick={() => { setIdx((i) => Math.min(words.length - 1, i + 1)); setFlipped(false); }}
          disabled={idx === words.length - 1}
          className="flex items-center gap-1 text-[11px] disabled:opacity-30"
          style={{ color: 'var(--et-fg-2)' }}
        >
          Tiếp <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
