'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';

interface SaveWordButtonProps {
  vocabularyItemId: string;
  materialId?: string | null;
  isSaved: boolean;
  onToggle: (vocabularyItemId: string, materialId?: string | null) => Promise<boolean>;
  compact?: boolean;
}

export function SaveWordButton({ vocabularyItemId, materialId, isSaved, onToggle, compact }: SaveWordButtonProps) {
  const [busy, setBusy] = useState(false);
  const [localSaved, setLocalSaved] = useState(isSaved);

  const handle = async () => {
    setBusy(true);
    const result = await onToggle(vocabularyItemId, materialId);
    setLocalSaved(result);
    setBusy(false);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        aria-label={localSaved ? 'Bỏ lưu từ' : 'Lưu từ'}
        style={{ color: localSaved ? 'var(--et-coral, #F4593A)' : 'var(--et-fg-2, #888)', opacity: busy ? 0.5 : 1 }}
      >
        {localSaved
          ? <BookmarkCheck className="h-4 w-4" />
          : <Bookmark className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className="ed-chip mt-1 self-start text-[11px] transition-colors flex items-center gap-1"
      style={localSaved ? { background: 'rgba(244,89,58,0.12)', color: 'var(--et-coral, #F4593A)', border: '1px solid var(--et-coral,#F4593A)' } : undefined}
    >
      {localSaved ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
      {localSaved ? 'Đã lưu' : 'Lưu từ'}
    </button>
  );
}
