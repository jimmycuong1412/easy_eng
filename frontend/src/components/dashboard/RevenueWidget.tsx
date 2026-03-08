'use client';

export function RevenueWidget() {
  return (
    <div className="rounded-lg border border-border-default bg-bg-surface p-6">
      <h2 className="mb-4 text-xl font-semibold text-text-primary">
        💵 Revenue
      </h2>
      <div className="text-text-secondary">
        <div className="text-3xl font-bold text-text-primary">$0.00</div>
        <p className="mt-2 text-sm">Total platform revenue</p>
      </div>
    </div>
  );
}
