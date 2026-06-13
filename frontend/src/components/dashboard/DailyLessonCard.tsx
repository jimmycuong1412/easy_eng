'use client';

/**
 * DailyLessonCard — "Bài học hôm nay"
 *
 * Surfaces one free material per day (get_daily_material) on the student
 * dashboard to give a reason to return daily. Links straight into the reader.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BookOpen, ArrowRight, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DailyMaterial {
  slug: string;
  type: string;
  level: string;
  title_vi: string;
  summary_vi: string;
  duration_min: number;
  gems_reward: number;
  xp_reward: number;
  already_completed: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  vocabulary_pack: 'Từ vựng',
  grammar_lesson: 'Ngữ pháp',
  reading_passage: 'Bài đọc',
  listening_audio: 'Luyện nghe',
  dialogue: 'Hội thoại',
  mock_test: 'Đề thi thử',
};

export default function DailyLessonCard() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'vi';
  const [material, setMaterial] = useState<DailyMaterial | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient() as any;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data, error } = await supabase.rpc('get_daily_material');
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (row) setMaterial(row as DailyMaterial);
      } catch (err) {
        console.error('Failed to load daily lesson:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="rounded-2xl animate-pulse" style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)', minHeight: 96 }} />;
  }
  if (!material) return null;

  return (
    <Link
      href={`/${locale}/materials/${material.slug}`}
      className="group block rounded-2xl p-5 transition-colors"
      style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}
    >
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--et-bg-3)' }}>
          <BookOpen className="h-6 w-6" style={{ color: 'var(--et-coral)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--et-coral)' }}>
              📘 Bài học hôm nay
            </span>
            {material.already_completed && (
              <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: '#22c55e' }}>
                <CheckCircle2 className="h-3 w-3" /> Đã hoàn thành
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-base font-semibold" style={{ color: 'var(--et-fg)' }}>
            {material.title_vi}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--et-fg-2)' }}>
            {TYPE_LABEL[material.type] ?? material.type} · {material.level?.toUpperCase()} · {material.duration_min} phút
            {material.gems_reward ? ` · +${material.gems_reward} 💎` : ''}
            {material.xp_reward ? ` · +${material.xp_reward} XP` : ''}
          </p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" style={{ color: 'var(--et-fg-2)' }} />
      </div>
    </Link>
  );
}
