'use client';

export const dynamic = 'force-dynamic';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, BookOpen, Brain, Flame, Trophy, Star, Calendar, CheckCircle } from 'lucide-react';
import { useProgressReport } from '@easyeng/core';

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Sơ cấp',
  elementary: 'Cơ bản',
  'pre-intermediate': 'Trước trung cấp',
  intermediate: 'Trung cấp',
  'upper-intermediate': 'Trung-cao',
  advanced: 'Nâng cao',
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string; color?: string }>;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}>
      <Icon className="h-5 w-5" color={color} />
      <div className="text-2xl font-bold leading-none" style={{ color: 'var(--et-fg)' }}>{value}</div>
      <div className="text-[11px] font-medium" style={{ color: 'var(--et-fg-2)' }}>{label}</div>
      {sub && <div className="text-[10px]" style={{ color }}>{sub}</div>}
    </div>
  );
}

export default function ProgressReportPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'vi';
  const { report, loading } = useProgressReport();

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'var(--et-bg-2)' }} />
          ))}
        </div>
      </div>
    );
  }

  const r = report;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 print:px-0 print:py-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Link href={`/${locale}/dashboard`} className="rounded p-1.5" style={{ color: 'var(--et-fg-2)', background: 'var(--et-bg-2)' }}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--et-fg)' }}>Báo cáo tiến bộ</h1>
          <p className="text-[12px]" style={{ color: 'var(--et-fg-2)' }}>
            {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium"
          style={{ background: 'var(--et-bg-2)', color: 'var(--et-fg-2)', border: '1px solid var(--et-line)' }}
        >
          <Printer className="h-3.5 w-3.5" /> Xuất PDF
        </button>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Báo cáo tiến bộ học tiếng Anh</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Level badge */}
      {r?.current_level && (
        <div className="rounded-xl p-4 mb-4 flex items-center gap-3" style={{ background: 'rgba(244,89,58,0.08)', border: '1px solid rgba(244,89,58,0.2)' }}>
          <Trophy className="h-6 w-6" style={{ color: 'var(--et-coral)' }} />
          <div>
            <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--et-coral)' }}>Trình độ của bạn</p>
            <p className="text-lg font-bold" style={{ color: 'var(--et-fg)' }}>
              {LEVEL_LABELS[r.current_level] ?? r.current_level}
            </p>
          </div>
          <Link
            href={`/${locale}/student/onboarding/quiz`}
            className="ml-auto text-[11px] px-2 py-1 rounded"
            style={{ background: 'var(--et-bg-2)', color: 'var(--et-fg-2)', border: '1px solid var(--et-line)' }}
          >
            Kiểm tra lại
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-6">
        <StatCard
          icon={BookOpen}
          label="Buổi học hoàn thành"
          value={r?.total_sessions_completed ?? 0}
          color="var(--et-coral)"
        />
        <StatCard
          icon={Flame}
          label="Streak hiện tại"
          value={`${r?.current_streak ?? 0} ngày`}
          sub={`Kỷ lục: ${r?.longest_streak ?? 0} ngày`}
          color="#fbbf24"
        />
        <StatCard
          icon={Brain}
          label="Từ vựng đã lưu"
          value={r?.total_vocab_saved ?? 0}
          sub={`${r?.total_vocab_reviewed ?? 0} từ đã ôn tập`}
          color="#60a5fa"
        />
        <StatCard
          icon={Star}
          label="Tổng XP"
          value={r?.total_xp ?? 0}
          color="#a78bfa"
        />
        <StatCard
          icon={Calendar}
          label="Ngày học (30 ngày qua)"
          value={r?.active_days_30 ?? 0}
          sub="ngày hoạt động"
          color="#2dd4bf"
        />
        <StatCard
          icon={CheckCircle}
          label="Bài học hoàn thành"
          value={r?.materials_completed ?? 0}
          color="#4ade80"
        />
      </div>

      {/* Insights */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--et-fg)' }}>Nhận xét</h2>
        {(r?.total_vocab_saved ?? 0) < 10 && (
          <p className="text-[12px]" style={{ color: 'var(--et-fg-2)' }}>
            💡 Lưu thêm từ vựng khi học để ôn tập dễ hơn — mục tiêu 20 từ/tuần.
          </p>
        )}
        {(r?.current_streak ?? 0) === 0 && (
          <p className="text-[12px]" style={{ color: 'var(--et-fg-2)' }}>
            🔥 Học 1 buổi hôm nay để bắt đầu streak mới!
          </p>
        )}
        {(r?.current_streak ?? 0) >= 7 && (
          <p className="text-[12px]" style={{ color: '#4ade80' }}>
            🏆 Streak {r?.current_streak} ngày — tuyệt vời, giữ vững nhé!
          </p>
        )}
        {(r?.total_sessions_completed ?? 0) === 0 && (
          <p className="text-[12px]" style={{ color: 'var(--et-fg-2)' }}>
            📚 Đặt lịch buổi học đầu tiên để bắt đầu hành trình học tiếng Anh.
          </p>
        )}
        {(r?.total_vocab_reviewed ?? 0) === 0 && (r?.total_vocab_saved ?? 0) > 0 && (
          <p className="text-[12px]" style={{ color: 'var(--et-fg-2)' }}>
            🧠 Bạn đã lưu {r?.total_vocab_saved} từ nhưng chưa ôn lần nào — thử flashcard ngay!
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="mt-4 flex gap-2 print:hidden">
        <Link
          href={`/${locale}/student/vocabulary`}
          className="flex-1 text-center rounded-xl py-2.5 text-sm font-semibold"
          style={{ background: 'var(--et-coral)', color: '#fff' }}
        >
          Ôn từ vựng
        </Link>
        <Link
          href={`/${locale}/dashboard/teachers`}
          className="flex-1 text-center rounded-xl py-2.5 text-sm font-semibold"
          style={{ background: 'var(--et-bg-2)', color: 'var(--et-fg)', border: '1px solid var(--et-line)' }}
        >
          Đặt lịch học
        </Link>
      </div>
    </div>
  );
}
