'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatNumber } from '@/lib/utils';
import {
  PinIcon, GlobeIcon, StarIcon, CheckIcon, FilterIcon, ArrowRIcon,
} from '@/components/editorial/Icons';

type Teacher = {
  id: string;
  name: string;
  avatar: string | null;
  bio: string;
  specializations: string[];
  languages: string[];
  hourlyRate: number;
  rating: number;
  totalReviews: number;
  totalClasses: number;
  isOnline: boolean;
  isVerified: boolean;
};

const FOCUS_VI = ['Nói', 'Viết', 'Ngữ pháp', 'Phát âm', 'Luyện thi', 'IELTS', 'Tiếng Anh thương mại'];
const FOCUS_EN = ['Speaking', 'Writing', 'Grammar', 'Pronunciation', 'Test prep', 'IELTS', 'Business English'];
const TIME_VI = ['Sáng sớm', 'Buổi sáng', 'Buổi trưa', 'Buổi tối', 'Khuya'];
const TIME_EN = ['Early', 'Morning', 'Midday', 'Evening', 'Late'];

export default function TeachersPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) ?? 'vi';
  const isVi = locale === 'vi';

  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [focusFilter, setFocusFilter] = React.useState<string | null>(null);
  const [timeFilter, setTimeFilter] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<'popular' | 'rating' | 'price_asc' | 'price_desc'>('popular');
  const [onlineOnly, setOnlineOnly] = React.useState(false);

  const ui = {
    title: isVi ? 'Tìm gia sư' : 'Find a tutor',
    sub: isVi ? 'Đã lọc theo trình độ và mục tiêu học tập của bạn.' : 'Filtered to tutors that match your level and goals.',
    searchPlaceholder: isVi ? 'Tìm theo tên, chuyên môn...' : 'Search by name, specialisation...',
    filters: isVi ? 'Bộ lọc' : 'Filters',
    focus: isVi ? 'Kỹ năng' : 'Focus',
    time: isVi ? 'Thời gian trong ngày' : 'Time of day',
    lessonLength: isVi ? 'Độ dài buổi học' : 'Lesson length',
    onlineOnly: isVi ? 'Đang trực tuyến' : 'Online now',
    sortLabel: isVi ? 'Sắp xếp' : 'Sort',
    sortOptions: isVi
      ? [['popular', 'Phổ biến nhất ↓'], ['rating', 'Đánh giá cao nhất'], ['price_asc', 'Giá thấp → cao'], ['price_desc', 'Giá cao → thấp']]
      : [['popular', 'Best fit ↓'], ['rating', 'Top rated'], ['price_asc', 'Price low → high'], ['price_desc', 'Price high → low']],
    matchCount: (n: number) => isVi ? `${n} gia sư phù hợp` : `${n} tutors match`,
    clearFilters: isVi ? 'Xóa bộ lọc' : 'Clear filters',
    perSession: isVi ? '/buổi' : '/session',
    viewProfile: isVi ? 'Xem hồ sơ' : 'View profile',
    bookNow: isVi ? 'Đặt lịch' : 'Book',
    moreTimes: isVi ? 'Thêm lịch →' : 'More times →',
    yourTutor: isVi ? 'Gia sư của bạn' : 'Your tutor',
    noResults: isVi ? 'Không tìm thấy gia sư phù hợp.' : 'No tutors match your filters.',
    allFocus: isVi ? 'Tất cả' : 'All',
    loading: isVi ? 'Đang tải...' : 'Loading...',
  };

  const focusItems = isVi ? FOCUS_VI : FOCUS_EN;
  const timeItems = isVi ? TIME_VI : TIME_EN;

  React.useEffect(() => {
    let cancelled = false;
    const load = async (attempt: number) => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio, role, is_active')
          .eq('role', 'teacher')
          .eq('is_active', true)
          .order('full_name', { ascending: true });

        if (error) throw error;
        if (cancelled) return;

        const mapped: Teacher[] = (data || []).map((t) => ({
          id: t.id as string,
          name: (t.full_name as string) || 'Teacher',
          avatar: (t.avatar_url as string) || null,
          bio: (t.bio as string) || '',
          specializations: [],
          languages: ['English', 'Vietnamese'],
          hourlyRate: 200000,
          rating: 4.9,
          totalReviews: 0,
          totalClasses: 0,
          isOnline: true,
          isVerified: true,
        }));
        setTeachers(mapped);
        setLoading(false);
      } catch (err) {
        if (!cancelled && attempt < 3) {
          setTimeout(() => load(attempt + 1), 1500 * (attempt + 1));
          return;
        }
        if (!cancelled) setLoading(false);
      }
    };
    load(0);
    return () => { cancelled = true; };
  }, []);

  const filtered = React.useMemo(() => {
    let result = [...teachers];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || t.bio.toLowerCase().includes(q)
      );
    }
    if (onlineOnly) result = result.filter((t) => t.isOnline);
    switch (sortBy) {
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'price_asc': result.sort((a, b) => a.hourlyRate - b.hourlyRate); break;
      case 'price_desc': result.sort((a, b) => b.hourlyRate - a.hourlyRate); break;
      default: result.sort((a, b) => b.totalClasses - a.totalClasses);
    }
    return result;
  }, [teachers, search, onlineOnly, sortBy]);

  const hasFilters = !!search || !!focusFilter || !!timeFilter || onlineOnly;

  const clearFilters = () => {
    setSearch('');
    setFocusFilter(null);
    setTimeFilter(null);
    setOnlineOnly(false);
    setSortBy('popular');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 1200, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <p className="ed-eyebrow">{ui.title.toUpperCase()}</p>
        <h1 className="ed-display" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', marginTop: 6, marginBottom: 0 }}>
          {isVi
            ? <><em style={{ fontStyle: 'italic', color: 'var(--ed-coral-ink)' }}>Chọn gia sư</em> phù hợp với bạn.</>
            : <>Find your <em style={{ fontStyle: 'italic', color: 'var(--ed-coral-ink)' }}>perfect</em> tutor.</>}
        </h1>
        <p className="ed-body" style={{ marginTop: 8, maxWidth: 540 }}>{ui.sub}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 28, alignItems: 'start' }}>
        {/* ── LEFT: Filters sidebar ── */}
        <aside>
          <p className="ed-eyebrow">{ui.filters}</p>

          {/* Search */}
          <div style={{ marginTop: 16 }}>
            <input
              type="text"
              placeholder={ui.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--ed-rule-strong)',
                background: 'var(--ed-paper-2)', color: 'var(--ed-ink-2)',
                fontSize: 13, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Focus */}
          <FilterBlock title={ui.focus}>
            <CheckRow
              label={ui.allFocus}
              checked={!focusFilter}
              onClick={() => setFocusFilter(null)}
            />
            {focusItems.map((f) => (
              <CheckRow
                key={f}
                label={f}
                checked={focusFilter === f}
                onClick={() => setFocusFilter(focusFilter === f ? null : f)}
              />
            ))}
          </FilterBlock>

          {/* Time of day */}
          <FilterBlock title={ui.time}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {timeItems.map((t) => (
                <span
                  key={t}
                  onClick={() => setTimeFilter(timeFilter === t ? null : t)}
                  className={`ed-chip${timeFilter === t ? ' ed-chip-ink' : ''}`}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  {t}
                </span>
              ))}
            </div>
          </FilterBlock>

          {/* Lesson length */}
          <FilterBlock title={ui.lessonLength}>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {['25 min', '50 min', '90 min'].map((l, i) => (
                <span
                  key={l}
                  className={`ed-chip${i === 1 ? ' ed-chip-ink' : ''}`}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  {l}
                </span>
              ))}
            </div>
          </FilterBlock>

          {/* Online only */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={onlineOnly}
              onChange={(e) => setOnlineOnly(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--ed-coral-ink)' }}
            />
            <span style={{ fontSize: 14, color: 'var(--ed-ink-2)' }}>{ui.onlineOnly}</span>
          </label>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ed-btn ed-btn-ghost ed-btn-sm"
              style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
            >
              {ui.clearFilters}
            </button>
          )}
        </aside>

        {/* ── RIGHT: Teacher list ── */}
        <div>
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span className="ed-tiny">
              {loading ? ui.loading : ui.matchCount(filtered.length)}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="ed-tiny">{ui.sortLabel}:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  border: '1px solid var(--ed-rule-strong)',
                  background: 'var(--ed-paper-2)', color: 'var(--ed-ink-2)',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                {ui.sortOptions.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <button className="ed-btn ed-btn-sm ed-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FilterIcon style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </div>

          {/* Teacher cards */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 160, borderRadius: 14,
                    background: 'var(--ed-paper-2)',
                    border: '1px solid var(--ed-rule)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="ed-card" style={{ padding: 48, textAlign: 'center' }}>
              <p className="ed-body" style={{ color: 'var(--ed-ink-mute)' }}>{ui.noResults}</p>
              {hasFilters && (
                <button onClick={clearFilters} className="ed-btn ed-btn-sm" style={{ marginTop: 16 }}>
                  {ui.clearFilters}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((teacher, idx) => (
                <TutorCard
                  key={teacher.id}
                  teacher={teacher}
                  locale={locale}
                  isVi={isVi}
                  featured={idx === 0}
                  ui={ui}
                  onBook={() => router.push(`/${locale}/book`)}
                  onProfile={() => router.push(`/${locale}/dashboard/teachers/${teacher.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Filter block ── */
function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 20 }}>
      <p className="ed-serif" style={{ fontSize: 17, color: 'var(--ed-ink-2)', marginBottom: 8, letterSpacing: '-0.01em' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
    </div>
  );
}

/* ── Checkbox row ── */
function CheckRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <label
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '2px 0' }}
    >
      <span
        style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          background: checked ? 'var(--ed-ink)' : 'var(--ed-paper-2)',
          border: `1px solid ${checked ? 'var(--ed-ink)' : 'var(--ed-rule-strong)'}`,
          display: 'grid', placeItems: 'center', color: '#F4EFE2',
        }}
      >
        {checked && <CheckIcon style={{ width: 9, height: 9, strokeWidth: 2.5 }} />}
      </span>
      <span style={{ fontSize: 13, color: 'var(--ed-ink-2)' }}>{label}</span>
    </label>
  );
}

/* ── Tutor card ── */
function TutorCard({
  teacher, locale, isVi, featured, ui, onBook, onProfile,
}: {
  teacher: Teacher;
  locale: string;
  isVi: boolean;
  featured: boolean;
  ui: Record<string, any>;
  onBook: () => void;
  onProfile: () => void;
}) {
  const focusLabels = isVi
    ? ['Nói', 'Ngữ pháp', 'Kinh doanh']
    : ['Speaking', 'Grammar', 'Business'];

  const mockSlots = isVi
    ? ['Hôm nay 14:00', 'Hôm nay 18:00', 'Ngày mai 09:00']
    : ['Today 2pm', 'Today 6pm', 'Tomorrow 9am'];

  return (
    <div
      style={{
        border: `1px solid ${featured ? 'var(--ed-ink)' : 'var(--ed-rule)'}`,
        borderRadius: 14,
        background: 'var(--ed-card)',
        boxShadow: featured ? '0 0 0 4px rgba(11,42,107,0.08)' : 'none',
        padding: 20,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 20,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 80, height: 100, borderRadius: 10, flexShrink: 0,
          background: 'var(--ed-paper-2)',
          border: '1px solid var(--ed-rule)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, position: 'relative',
        }}
      >
        {teacher.avatar
          ? <img src={teacher.avatar} alt={teacher.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
          : '👨‍🏫'}
        {teacher.isOnline && (
          <span
            style={{
              position: 'absolute', bottom: 6, right: 6,
              width: 10, height: 10, borderRadius: 999,
              background: 'oklch(0.55 0.15 150)',
              border: '2px solid var(--ed-card)',
            }}
          />
        )}
      </div>

      {/* Info */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <p className="ed-serif" style={{ fontSize: 22, color: 'var(--ed-ink-2)', letterSpacing: '-0.02em' }}>
            {teacher.name}
          </p>
          {teacher.isVerified && (
            <span style={{ fontSize: 12, color: 'var(--ed-coral-ink)', fontWeight: 600 }}>✓</span>
          )}
          {featured && (
            <span className="ed-chip ed-chip-sky" style={{ fontSize: 10 }}>
              {ui.yourTutor}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 5, flexWrap: 'wrap' }}>
          <span className="ed-tiny" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <PinIcon style={{ width: 10, height: 10 }} />
            {isVi ? 'Việt Nam' : 'Vietnam'}
          </span>
          <span className="ed-tiny" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <GlobeIcon style={{ width: 10, height: 10 }} />
            {teacher.languages.join(', ')}
          </span>
          <span className="ed-tiny" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <StarIcon style={{ width: 10, height: 10 }} />
            {teacher.rating.toFixed(1)} · {teacher.totalReviews} {isVi ? 'đánh giá' : 'reviews'}
          </span>
        </div>

        {teacher.bio ? (
          <p className="ed-body" style={{ marginTop: 8, maxWidth: 460, fontStyle: 'italic', color: 'var(--ed-ink-soft)', fontSize: 13 }}>
            "{teacher.bio.length > 120 ? teacher.bio.slice(0, 120) + '…' : teacher.bio}"
          </p>
        ) : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {focusLabels.map((f) => (
            <span key={f} className="ed-chip" style={{ fontSize: 11 }}>{f}</span>
          ))}
        </div>
      </div>

      {/* Right: price + slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
        <p className="ed-serif" style={{ fontSize: 20, color: 'var(--ed-ink-2)' }}>
          {formatNumber(teacher.hourlyRate)}đ
        </p>
        <span className="ed-tiny" style={{ marginTop: -6 }}>{ui.perSession}</span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 150, marginTop: 4 }}>
          {mockSlots.map((slot, i) => (
            <button
              key={i}
              onClick={onBook}
              className="ed-btn ed-btn-sm"
              style={{
                justifyContent: 'space-between',
                background: featured && i === 0 ? 'var(--ed-ink)' : 'var(--ed-paper-2)',
                color: featured && i === 0 ? '#F4EFE2' : 'var(--ed-ink-2)',
                borderColor: featured && i === 0 ? 'var(--ed-ink)' : 'var(--ed-rule-strong)',
                display: 'flex', alignItems: 'center',
                fontSize: 12,
              }}
            >
              {slot} <ArrowRIcon style={{ width: 10, height: 10 }} />
            </button>
          ))}
          <button
            onClick={onProfile}
            className="ed-btn ed-btn-sm ed-btn-ghost"
            style={{ justifyContent: 'center', fontSize: 12 }}
          >
            {ui.viewProfile}
          </button>
        </div>
      </div>
    </div>
  );
}
