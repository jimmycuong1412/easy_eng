'use client';

/**
 * Soft wall shown after the anonymous daily clip limit.
 *
 * Deliberately framed as SAVING work rather than blocking access: a wall that
 * says "you'll lose your 82%" converts better than one that says "you've hit
 * your limit". Everything already earned stays visible behind it.
 */

import Link from 'next/link';

export interface SignupWallProps {
  bestScore: number | null;
  locale: string;
}

export function SignupWall({ bestScore, locale }: SignupWallProps) {
  return (
    <div
      className="space-y-3 rounded-xl p-5 text-center"
      style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}
    >
      {bestScore !== null && (
        <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--et-green)' }}>
          {bestScore}%
        </p>
      )}

      <p className="text-sm font-semibold" style={{ color: 'var(--et-fg)' }}>
        Đăng ký miễn phí để lưu kết quả của bạn
      </p>
      <p className="text-xs" style={{ color: 'var(--et-fg-2)' }}>
        Giữ chuỗi ngày luyện tập, xem tiến bộ theo thời gian và mở khoá toàn bộ thư viện.
      </p>

      <div className="flex flex-col gap-2 pt-1">
        <Link
          href={`/${locale}/auth/register`}
          data-testid="wall-signup"
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'var(--et-coral)' }}
        >
          Đăng ký miễn phí
        </Link>
        <Link
          href={`/${locale}/auth/login`}
          data-testid="wall-login"
          className="text-xs"
          style={{ color: 'var(--et-fg-2)' }}
        >
          Đã có tài khoản? Đăng nhập
        </Link>
      </div>
    </div>
  );
}
