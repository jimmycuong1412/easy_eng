/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Shareable achievement card (Growth 2.3).
 * GET /api/og/achievement?kind=streak&value=7&name=Minh
 *   kind: streak | level | referral | certificate
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kind = sp.get('kind') ?? 'streak';
  const value = sp.get('value') ?? '0';
  const name = (sp.get('name') ?? 'Học viên').slice(0, 40);

  const themes: Record<string, { emoji: string; headline: string; sub: string; accent: string }> = {
    streak: { emoji: '🔥', headline: `${value} ngày học liên tục`, sub: 'Chuỗi học không nghỉ trên EasyEng', accent: '#ff7a59' },
    level: { emoji: '⭐', headline: `Đạt Cấp ${value}`, sub: 'Tiến bộ mỗi ngày cùng EasyEng', accent: '#7c5cff' },
    referral: { emoji: '🎁', headline: `Đã mời ${value} người bạn`, sub: 'Cùng học tiếng Anh trên EasyEng', accent: '#22c55e' },
    certificate: { emoji: '🏆', headline: `Hoàn thành ${value}`, sub: 'Chứng chỉ EasyEng', accent: '#f59e0b' },
  };
  const th = themes[kind] ?? themes.streak;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#060f33',
          color: '#f5f7ff', fontFamily: 'sans-serif', padding: 64, position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 48, left: 56, display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 700 }}>
          <span style={{ color: th.accent, marginRight: 10 }}>◆</span> EasyEng
        </div>
        <div style={{ fontSize: 150, marginBottom: 8 }}>{th.emoji}</div>
        <div style={{ fontSize: 76, fontWeight: 800, textAlign: 'center', color: th.accent }}>{th.headline}</div>
        <div style={{ fontSize: 36, marginTop: 16, color: '#c8ccea' }}>{th.sub}</div>
        <div style={{ fontSize: 30, marginTop: 40, color: '#f5f7ff' }}>👤 {name}</div>
        <div style={{ position: 'absolute', bottom: 48, fontSize: 26, color: '#8b93c0' }}>
          easyeng-dev.vercel.app — Học tiếng Anh vui mỗi ngày
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
