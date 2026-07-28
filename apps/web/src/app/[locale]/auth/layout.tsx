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
      {/* Ambient glows — lower opacity so they read as a soft wash on white */}
      <div
        className="et-glow"
        style={{
          width: 600,
          height: 600,
          background: '#6d4aff',
          top: -200,
          left: '-10%',
          opacity: 0.12,
        }}
      />
      <div
        className="et-glow"
        style={{
          width: 500,
          height: 500,
          background: '#3b5bff',
          bottom: -160,
          right: '-8%',
          opacity: 0.10,
        }}
      />

      {/* Header */}
      <header
        style={{
          padding: '20px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-default)',
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
          borderTop: '1px solid var(--border-default)',
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
