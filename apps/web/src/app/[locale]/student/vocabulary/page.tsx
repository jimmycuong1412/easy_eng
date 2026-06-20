'use client';

import nextDynamic from 'next/dynamic';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Brain, ArrowLeft, Bookmark, Calendar } from 'lucide-react';
import { useSavedWords } from '@easyeng/core';

const FlashcardSession = nextDynamic(
  () => import('@/components/vocabulary/FlashcardSession').then((m) => m.FlashcardSession),
  { ssr: false },
);

type Tab = 'all' | 'due';

export default function VocabularyNotebookPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'vi';
  const [tab, setTab] = useState<Tab>('all');
  const [reviewing, setReviewing] = useState(false);

  const { words: allWords, loading: loadingAll, toggle, review } = useSavedWords(false);
  const { words: dueWords, loading: loadingDue } = useSavedWords(true);

  const displayed = tab === 'all' ? allWords : dueWords;
  const loading = tab === 'all' ? loadingAll : loadingDue;

  if (reviewing) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <button onClick={() => setReviewing(false)} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: 'var(--et-fg-2)' }}>
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>
        <FlashcardSession
          words={dueWords}
          onReview={review}
          onDone={() => setReviewing(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/dashboard`} className="rounded p-1.5" style={{ color: 'var(--et-fg-2)', background: 'var(--et-bg-2)' }}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--et-fg)' }}>Từ vựng của tôi</h1>
          <p className="text-[12px]" style={{ color: 'var(--et-fg-2)' }}>{allWords.length} từ đã lưu</p>
        </div>
        {dueWords.length > 0 && (
          <button
            onClick={() => setReviewing(true)}
            className="ml-auto flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ background: 'var(--et-coral)', color: '#fff' }}
          >
            <Brain className="h-4 w-4" />
            Ôn tập ({dueWords.length})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg mb-4" style={{ background: 'var(--et-bg-2)' }}>
        {([
          { key: 'all', label: 'Tất cả', icon: Bookmark },
          { key: 'due', label: `Cần ôn hôm nay (${dueWords.length})`, icon: Calendar },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium transition-all"
            style={tab === key
              ? { background: 'var(--et-coral)', color: '#fff' }
              : { color: 'var(--et-fg-2)' }}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Word list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--et-bg-2)' }} />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <BookOpen className="h-12 w-12 opacity-20" style={{ color: 'var(--et-fg-2)' }} />
          <p className="text-sm" style={{ color: 'var(--et-fg-2)' }}>
            {tab === 'all'
              ? 'Chưa có từ nào. Bấm ⭐ trên bài học để lưu từ vựng.'
              : 'Không có từ nào cần ôn hôm nay — giỏi lắm!'}
          </p>
          {tab === 'all' && (
            <Link href={`/${locale}/materials`} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ background: 'var(--et-coral)', color: '#fff' }}>
              Khám phá bài học
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {displayed.map((word) => (
            <li
              key={word.save_id}
              className="rounded-xl p-3"
              style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold" style={{ color: 'var(--et-fg)', fontFamily: 'var(--font-newsreader, serif)' }}>
                      {word.term}
                    </span>
                    {word.pos && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg-2)' }}>
                        {word.pos}
                      </span>
                    )}
                    {word.ipa && (
                      <span className="text-[11px] font-mono" style={{ color: 'var(--et-fg-2)' }}>{word.ipa}</span>
                    )}
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--et-fg-2)' }}>{word.gloss_vi}</p>
                  {word.material_title && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--et-fg-2)' }}>📖 {word.material_title}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button
                    onClick={() => toggle(word.vocabulary_item_id, word.material_id)}
                    className="text-[10px] px-2 py-0.5 rounded"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    Bỏ lưu
                  </button>
                  {word.times_reviewed > 0 && (
                    <span className="text-[10px]" style={{ color: 'var(--et-fg-2)' }}>
                      Ôn {word.times_reviewed}×
                    </span>
                  )}
                  {word.srs_due_date <= new Date().toISOString().slice(0, 10) && (
                    <span className="text-[10px] font-medium" style={{ color: 'var(--et-coral)' }}>Cần ôn</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
