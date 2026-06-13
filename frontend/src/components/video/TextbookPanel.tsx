'use client';

/**
 * TextbookPanel
 *
 * The center column of the live classroom — a scrollable lesson/textbook
 * surface. The teacher picks a published material ("Đổi giáo trình"); the
 * chosen material's body renders in a paper-like reading panel for both
 * teacher and student. Inspired by NativeCamp's textbook-centred lesson UI,
 * restyled to the EasyEng editorial dark theme.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { BookOpen, ChevronDown, Search, X, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  fetchMaterialsList,
  fetchMaterialDetail,
  type MaterialSummary,
  type MaterialDetail,
} from '@/lib/queries/materials';
import { MaterialBody } from '@/components/materials/MaterialBody';

interface TextbookPanelProps {
  canChange: boolean; // teacher can swap the material
}

export default function TextbookPanel({ canChange }: TextbookPanelProps) {
  const locale = useLocale() as 'vi' | 'en';
  const [pickerOpen, setPickerOpen] = useState(false);
  const [list, setList] = useState<MaterialSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [material, setMaterial] = useState<MaterialDetail | null>(null);
  const [bodyLoading, setBodyLoading] = useState(false);

  const title = (m: { title_vi: string; title_en: string | null }) =>
    locale === 'en' ? (m.title_en || m.title_vi) : m.title_vi;

  // Load the catalog when the picker opens (once)
  useEffect(() => {
    if (!pickerOpen || list.length > 0) return;
    let cancelled = false;
    setListLoading(true);
    fetchMaterialsList(getSupabaseClient(), { limit: 60 })
      .then(({ items }) => { if (!cancelled) setList(items); })
      .catch((e) => console.error('Failed to load materials:', e))
      .finally(() => { if (!cancelled) setListLoading(false); });
    return () => { cancelled = true; };
  }, [pickerOpen, list.length]);

  // Load full body when a material is selected (fetchMaterialDetail keys on slug)
  useEffect(() => {
    if (!selectedSlug) return;
    let cancelled = false;
    setBodyLoading(true);
    fetchMaterialDetail(getSupabaseClient(), selectedSlug)
      .then((d) => { if (!cancelled) setMaterial(d); })
      .catch((e) => console.error('Failed to load material:', e))
      .finally(() => { if (!cancelled) setBodyLoading(false); });
    return () => { cancelled = true; };
  }, [selectedSlug]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => title(m).toLowerCase().includes(q));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, search, locale]);

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--et-bg-2)' }}>
      {/* Panel header */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-3"
        style={{ borderBottom: '1px solid var(--et-line)' }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <BookOpen className="h-4 w-4 shrink-0" style={{ color: 'var(--et-coral)' }} />
          <span className="truncate text-sm font-semibold" style={{ color: 'var(--et-fg)' }}>
            {material ? title(material) : 'Giáo trình'}
          </span>
        </div>
        {canChange && (
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ background: 'var(--et-coral)', color: '#fff' }}
          >
            Đổi giáo trình
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Body — scrollable paper surface */}
      <div className="relative flex-1 overflow-y-auto">
        {bodyLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--et-coral)' }} />
          </div>
        ) : material ? (
          <div className="mx-auto max-w-3xl px-6 py-8">
            <div
              className="rounded-2xl px-7 py-8 shadow-sm"
              style={{ background: 'var(--et-bg-3)', border: '1px solid var(--et-line)' }}
            >
              <MaterialBody material={material} locale={locale} />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div
              className="grid h-16 w-16 place-items-center rounded-2xl"
              style={{ background: 'var(--et-bg-3)' }}
            >
              <BookOpen className="h-7 w-7" style={{ color: 'var(--et-coral)' }} />
            </div>
            <p className="mt-4 text-base font-medium" style={{ color: 'var(--et-fg)' }}>
              Chưa chọn giáo trình
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--et-fg-2)' }}>
              {canChange
                ? 'Nhấn "Đổi giáo trình" để chọn bài học cho buổi học này.'
                : 'Giáo viên sẽ chọn giáo trình khi buổi học bắt đầu.'}
            </p>
            {canChange && (
              <button
                onClick={() => setPickerOpen(true)}
                className="mt-5 rounded-lg px-4 py-2 text-sm font-medium"
                style={{ background: 'var(--et-coral)', color: '#fff' }}
              >
                Chọn giáo trình
              </button>
            )}
          </div>
        )}

        {/* Material picker overlay */}
        {pickerOpen && canChange && (
          <div className="absolute inset-0 z-20 flex flex-col" style={{ background: 'var(--et-bg-2)' }}>
            <div
              className="flex items-center gap-3 px-5 py-3"
              style={{ borderBottom: '1px solid var(--et-line)' }}
            >
              <div
                className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: 'var(--et-bg-3)', border: '1px solid var(--et-line)' }}
              >
                <Search className="h-4 w-4" style={{ color: 'var(--et-fg-2)' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm giáo trình…"
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: 'var(--et-fg)' }}
                />
              </div>
              <button
                onClick={() => setPickerOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg"
                style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg-2)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {listLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--et-coral)' }} />
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-sm" style={{ color: 'var(--et-fg-2)' }}>
                  Không tìm thấy giáo trình phù hợp
                </p>
              ) : (
                <div className="space-y-2">
                  {filtered.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedSlug(m.slug); setPickerOpen(false); }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors"
                      style={{
                        background: m.slug === selectedSlug ? 'var(--et-bg-4)' : 'var(--et-bg-3)',
                        border: '1px solid var(--et-line)',
                      }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--et-fg)' }}>
                          {title(m)}
                        </p>
                        <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--et-fg-2)' }}>
                          {m.type} · {m.level.toUpperCase()} · {m.duration_min} phút
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase"
                        style={{ background: 'var(--et-bg-2)', color: 'var(--et-coral)' }}
                      >
                        {m.level}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
