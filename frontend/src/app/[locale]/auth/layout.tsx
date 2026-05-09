import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ed-frame" style={{ minHeight: '100vh' }}>
      {/* Editorial header */}
      <header
        style={{
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--ed-rule)',
        }}
      >
        <Link href="/" className="ed-brand">
          <span className="ed-brand-mark">e</span>
          <span>easyeng</span>
        </Link>
        <p className="ed-eyebrow">A new way to learn English</p>
      </header>

      {/* Main */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
        }}
      >
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '20px 28px',
          textAlign: 'center',
          borderTop: '1px solid var(--ed-rule)',
        }}
      >
        <p className="ed-tiny">
          &copy; {new Date().getFullYear()} EasyEng. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
