'use client';

/**
 * /[locale]/materials/admin/editor/[id] — Material editor page.
 *
 * Role guard: admin can edit any material; teacher can only edit their own drafts.
 * Renders <MaterialEditor> with data fetched client-side.
 */

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MaterialEditor, type MaterialEditorDraft } from '@/components/materials/editor/MaterialEditor';
import type { VocabItemDraft } from '@/components/materials/editor/VocabularyItemsEditor';
import type { TestItemDraft } from '@/components/materials/editor/MockTestItemsEditor';
import { fetchMaterialForEditor, fetchVocabItemsForEditor, fetchTestItemsForEditor } from '@/lib/queries/materials';

export default function MaterialEditorPage() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'teacher']}>
      <MaterialEditorContent />
    </ProtectedRoute>
  );
}

function MaterialEditorContent() {
  const { locale, id } = useParams() as { locale: string; id: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [draft, setDraft] = useState<MaterialEditorDraft | null>(null);
  const [vocabItems, setVocabItems] = useState<VocabItemDraft[]>([]);
  const [testItems, setTestItems] = useState<TestItemDraft[]>([]);

  useEffect(() => {
    loadMaterial();
  }, [id]);

  async function loadMaterial() {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/${locale}/auth/login?redirect=/${locale}/materials/admin/editor/${id}`);
      return;
    }

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role: 'admin' | 'teacher' = profile?.role ?? 'teacher';

    try {
      const material = await fetchMaterialForEditor(supabase as any, id);

      if (!material) {
        setLoading(false);
        return;
      }

      // Teachers may only edit their own drafts
      if (role === 'teacher' && material.author_id !== user.id) {
        setForbidden(true);
        setLoading(false);
        return;
      }

      setDraft(material);

      // Fetch type-specific items in parallel
      if (material.type === 'vocabulary_pack') {
        const items = await fetchVocabItemsForEditor(supabase as any, material.id!);
        setVocabItems(items);
      }
      if (material.type === 'mock_test') {
        const items = await fetchTestItemsForEditor(supabase as any, material.id!);
        setTestItems(items);
      }
    } catch {
      // Material not found or access denied — RLS handles this
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="ed-frame flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--ed-ink-mute, #6B7280)' }} />
      </div>
    );
  }

  if (forbidden) {
    return (
      <main className="ed-frame min-h-screen">
        <div className="ed-content mx-auto max-w-3xl px-6 py-10 text-center">
          <p
            className="font-serif text-2xl"
            style={{ fontFamily: 'var(--font-newsreader, serif)', color: 'var(--ed-ink-2, #0A1F4F)' }}
          >
            Bạn không có quyền chỉnh sửa tài liệu này
          </p>
          <Link
            href={`/${locale}/materials/admin`}
            className="mt-4 inline-block text-sm underline"
            style={{ color: 'var(--ed-ink-mute, #6B7280)' }}
          >
            ← Quay lại danh sách
          </Link>
        </div>
      </main>
    );
  }

  if (!draft) {
    return (
      <main className="ed-frame min-h-screen">
        <div className="ed-content mx-auto max-w-3xl px-6 py-10 text-center">
          <p style={{ color: 'var(--ed-ink-mute, #6B7280)' }}>Không tìm thấy tài liệu.</p>
          <Link
            href={`/${locale}/materials/admin`}
            className="mt-4 inline-block text-sm underline"
            style={{ color: 'var(--ed-ink-mute, #6B7280)' }}
          >
            ← Quay lại danh sách
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="ed-frame min-h-screen">
      <div className="ed-content mx-auto max-w-4xl px-6 py-10">
        <nav className="mb-6">
          <Link
            href={`/${locale}/materials/admin`}
            className="text-sm underline"
            style={{ color: 'var(--ed-ink-mute, #6B7280)' }}
          >
            ← Danh sách tài liệu
          </Link>
        </nav>

        <header className="mb-8">
          <h1
            className="font-serif text-3xl font-medium"
            style={{ fontFamily: 'var(--font-newsreader, serif)', color: 'var(--ed-ink-2, #0A1F4F)' }}
          >
            {draft.title_vi || 'Tài liệu mới'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ed-ink-mute, #6B7280)' }}>
            Trạng thái:{' '}
            <span className="font-medium" style={{ color: 'var(--ed-ink, #0B2A6B)' }}>
              {draft.status}
            </span>
          </p>
        </header>

        <MaterialEditor
          initialData={draft}
          initialVocabItems={vocabItems}
          initialTestItems={testItems}
          onSaved={(savedId) => {
            // Redirect to ensure URL reflects the real ID (for new materials)
            if (savedId !== id) {
              router.replace(`/${locale}/materials/admin/editor/${savedId}`);
            } else {
              // Reload to pick up fresh updated_at
              loadMaterial();
            }
          }}
        />
      </div>
    </main>
  );
}
