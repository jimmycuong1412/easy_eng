'use client';
import { GemImage } from '@/components/common/GemImage';

export function GemAnalyticsWidget() {
  return (
    <div className="rounded-lg border border-border-default bg-bg-surface p-6">
      <h2 className="mb-4 text-xl font-semibold text-text-primary">
        <GemImage size={20} className="inline-block align-middle mr-1" /> Gems Analytics
      </h2>
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-text-primary">0</div>
          <div className="text-sm text-text-secondary">Total Earned</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-text-primary">0</div>
          <div className="text-sm text-text-secondary">Total Spent</div>
        </div>
      </div>
    </div>
  );
}
