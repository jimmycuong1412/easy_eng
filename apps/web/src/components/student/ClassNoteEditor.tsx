'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NotebookPen, Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ClassNoteEditorProps {
  bookingId: string;
  initialContent?: string;
}

export function ClassNoteEditor({ bookingId, initialContent = '' }: ClassNoteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [open, setOpen] = useState(!!initialContent);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async (text: string) => {
    setSaving(true);
    try {
      const supabase = createClient() as any;
      const { error } = await supabase.rpc('upsert_class_note', {
        p_booking_id: bookingId,
        p_content: text,
      });
      if (!error) setSavedAt(new Date());
    } catch (err) {
      console.error('ClassNoteEditor save error:', err);
    } finally {
      setSaving(false);
    }
  }, [bookingId]);

  const handleChange = (text: string) => {
    setContent(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(text), 1200);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[12px] mt-2"
        style={{ color: 'var(--et-fg-2)' }}
      >
        <NotebookPen className="h-3.5 w-3.5" />
        Thêm ghi chú buổi học
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg p-3" style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}>
      <div className="flex items-center gap-2 mb-2">
        <NotebookPen className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--et-coral)' }} />
        <span className="text-[11px] font-semibold" style={{ color: 'var(--et-fg)' }}>Ghi chú của tôi</span>
        <div className="ml-auto flex items-center gap-1 text-[10px]" style={{ color: 'var(--et-fg-2)' }}>
          {saving
            ? <><Loader2 className="h-3 w-3 animate-spin" /> Đang lưu...</>
            : savedAt
              ? <><Check className="h-3 w-3 text-green-400" /> Đã lưu {savedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</>
              : null}
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Ghi lại những gì bạn học được, từ mới, cấu trúc hay..."
        rows={4}
        className="w-full resize-none rounded p-2 text-[12px] leading-relaxed"
        style={{
          background: 'var(--et-bg-3)',
          color: 'var(--et-fg)',
          border: '1px solid var(--et-line)',
          outline: 'none',
        }}
      />
    </div>
  );
}
