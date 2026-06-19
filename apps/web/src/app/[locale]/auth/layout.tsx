import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('common');

  return (
    <div
      className="edtech"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glows */}
      <div
        className="et-glow"
        style={{
          width: 600,
          height: 600,
          background: '#7c5cff',
          top: -200,
          left: '-10%',
          opacity: 0.30,
        }}
      />
      <div
        className="et-glow"
        style={{
          width: 500,
          height: 500,
          background: '#4c6bff',
          bottom: -160,
          right: '-8%',
          opacity: 0.25,
        }}
      />

      {/* Header */}
      <header
        style={{
          padding: '20px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(91, 141, 255, 0.13)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Link href="/" className="et-brand">
          <span className="et-mark">e</span>
          <span>easyeng</span>
        </Link>
        <p className="et-eyebrow">{t('authTagline')}</p>
      </header>

      {/* Main */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '20px 40px',
          textAlign: 'center',
          borderTop: '1px solid rgba(91, 141, 255, 0.13)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <p className="et-tiny">
          {t('copyright', { year: new Date().getFullYear() })}
        </p>
      </footer>
    </div>
  );
}
