'use client';

/**
 * /[locale]/materials/admin — Materials admin catalog manager.
 *
 * Role guard: admin sees all materials; teacher sees own drafts only.
 * Provides "Tạo mới" with a type-picker modal.
 */

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Loader2, FileText } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import type { MaterialType, MaterialLevel, MaterialStatus } from '@easyeng/core';

interface AdminMaterialRow {
  id: string;
  slug: string;
  type: MaterialType;
  level: MaterialLevel;
  status: MaterialStatus;
  title_vi: string;
  author_id: string;
  updated_at: string;
  published_at: string | null;
}

const STATUS_LABELS: Record<MaterialStatus, string> = {
  draft: 'Bản nháp',
  in_review: 'Đang xét duyệt',
  published: 'Đã xuất bản',
  archived: 'Đã lưu trữ',
};

const STATUS_COLORS: Record<MaterialStatus, string> = {
  draft: 'var(--ed-ink-mute, #6B7280)',
  in_review: '#B45309',
  published: '#166534',
  archived: 'var(--ed-ink-mute, #6B7280)',
};

const TYPE_LABELS: Record<MaterialType, string> = {
  vocabulary_pack: 'Từ vựng',
  grammar_lesson: 'Ngữ pháp',
  reading_passage: 'Đọc',
  listening_audio: 'Nghe',
  dialogue: 'Hội thoại',
  mock_test: 'Đề luyện thi',
};

const MATERIAL_TYPES: MaterialType[] = [
  'vocabulary_pack', 'grammar_lesson', 'reading_passage',
  'listening_audio', 'dialogue', 'mock_test',
];

export default function MaterialsAdminPage() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'teacher']}>
      <MaterialsAdminContent />
    </ProtectedRoute>
  );
}

function MaterialsAdminContent() {
  const { locale } = useParams() as { locale: string };
  const router = useRouter();
  const t = useTranslations('materials');

  const [materials, setMaterials] = useState<AdminMaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'teacher' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [creatingType, setCreatingType] = useState<MaterialType | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role: 'admin' | 'teacher' = profile?.role ?? 'teacher';
    setUserRole(role);

    let query = (supabase as any)
      .from('materials')
      .select('id, slug, type, level, status, title_vi, author_id, updated_at, published_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (role === 'teacher') {
      query = query.eq('author_id', user.id);
    }

    const { data } = await query;
    setMaterials(data ?? []);
    setLoading(false);
  }

  async function createNewMaterial(type: MaterialType) {
    if (!userId) return;
    setCreatingType(type);

    const supabase = createClient();
    const slug = `draft-${type}-${Date.now()}`;

    const { data, error } = await (supabase as any)
      .from('materials')
      .insert({
        type,
        level: 'a1',
        status: 'draft',
        slug,
        title_vi: '',
        summary_vi: '',
        body_vi: '',
        duration_min: 10,
        gems_reward: type === 'mock_test' ? 0 : 3,
        xp_reward: type === 'mock_test' ? 0 : 40,
        min_completion_pct: 80,
        author_id: userId,
      })
      .select('id')
      .single();

    setCreatingType(null);
    setShowTypeModal(false);

    if (!error && data?.id) {
      router.push(`/${locale}/materials/admin/editor/${data.id}`);
    }
  }

  return (
    <main className="ed-frame min-h-screen">
      <div className="ed-content mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <nav className="mb-2">
              <Link
                href={`/${locale}/materials`}
                className="text-sm underline"
                style={{ color: 'var(--ed-ink-mute, #6B7280)' }}
              >
                ← Thư viện tài liệu
              </Link>
            </nav>
            <h1
              className="font-serif text-3xl font-medium"
              style={{ fontFamily: 'var(--font-newsreader, serif)', color: 'var(--ed-ink-2, #0A1F4F)' }}
            >
              {userRole === 'admin' ? 'Quản lý tài liệu' : 'Tài liệu của tôi'}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setShowTypeModal(true)}
            className="ed-btn ed-btn-primary flex items-center gap-2"
            data-testid="create-material-btn"
          >
            <Plus className="h-4 w-4" />
            {t('editor.createNew')}
          </button>
        </div>

        {/* Material list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--ed-ink-mute, #6B7280)' }} />
          </div>
        ) : materials.length === 0 ? (
          <div className="py-16 text-center">
            <FileText
              className="mx-auto mb-3 h-10 w-10"
              style={{ color: 'var(--ed-ink-mute, #6B7280)' }}
            />
            <p
              className="font-serif text-lg"
              style={{ fontFamily: 'var(--font-newsreader, serif)', color: 'var(--ed-ink-2, #0A1F4F)' }}
            >
              Chưa có tài liệu nào
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ed-ink-mute, #6B7280)' }}>
              Nhấn "Tạo mới" để bắt đầu soạn bài học đầu tiên.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))' }}>
            {materials.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 py-3"
                data-testid={`admin-material-row-${m.id}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="ed-chip text-[11px]"
                      style={{ fontSize: '11px' }}
                    >
                      {TYPE_LABELS[m.type]}
                    </span>
                    <span
                      className="font-mono text-[11px] uppercase"
                      style={{ color: 'var(--ed-ink-mute, #6B7280)' }}
                    >
                      {m.level.toUpperCase()}
                    </span>
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: STATUS_COLORS[m.status] }}
                    >
                      {STATUS_LABELS[m.status]}
                    </span>
                  </div>
                  <p
                    className="mt-1 truncate font-serif text-base"
                    style={{ fontFamily: 'var(--font-newsreader, serif)', color: 'var(--ed-ink-2, #0A1F4F)' }}
                  >
                    {m.title_vi || <span style={{ color: 'var(--ed-ink-mute, #6B7280)' }}>(chưa có tiêu đề)</span>}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--ed-ink-mute, #6B7280)' }}>
                    Cập nhật {new Date(m.updated_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>

                <Link
                  href={`/${locale}/materials/admin/editor/${m.id}`}
                  className="ed-btn text-sm"
                  style={{
                    background: 'var(--ed-paper-2, #FBF9F4)',
                    border: '1px solid var(--ed-rule, rgba(0,0,0,0.08))',
                    color: 'var(--ed-ink, #0B2A6B)',
                    borderRadius: '6px',
                    padding: '0.25rem 0.75rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Chỉnh sửa
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Type-picker modal */}
      {showTypeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowTypeModal(false)}
        >
          <div
            className="ed-card w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="font-serif text-xl"
              style={{ fontFamily: 'var(--font-newsreader, serif)', color: 'var(--ed-ink-2, #0A1F4F)' }}
            >
              Chọn loại tài liệu
            </h2>
            <ul className="space-y-2">
              {MATERIAL_TYPES.map((type) => (
                <li key={type}>
                  <button
                    type="button"
                    onClick={() => createNewMaterial(type)}
                    disabled={creatingType !== null}
                    className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm transition-colors hover:bg-[color:var(--ed-coral-2,#FFE7E0)]"
                    style={{
                      borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))',
                      color: 'var(--ed-ink, #0B2A6B)',
                    }}
                    data-testid={`create-type-${type}`}
                  >
                    <span>{TYPE_LABELS[type]}</span>
                    {creatingType === type && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setShowTypeModal(false)}
              className="w-full text-sm"
              style={{ color: 'var(--ed-ink-mute, #6B7280)' }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
