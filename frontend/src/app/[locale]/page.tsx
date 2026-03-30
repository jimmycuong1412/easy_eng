'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { LanguageSwitcher, GemImage } from '@/components/common';

export default function HomePage() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');

  return (
    <div className="min-h-screen bg-gradient-primary flex flex-col">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Logo / Brand */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold text-gradient mb-4">
            {tCommon('appName')}
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto">
            {t('tagline')}
          </p>
        </div>

        {/* Gem Animation */}
        <div className="relative w-32 h-32 mb-8 animate-float">
          <div className="absolute inset-0 rounded-full bg-accent-gem/20 blur-xl" />
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-accent-gem to-amber-600 flex items-center justify-center shadow-lg glow-gem">
            <GemImage size={80} alt="Gem" />
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-slide-up">
          <Link
            href="/auth/signup"
            className="btn-primary text-lg px-8 py-4 shadow-lg hover:shadow-glow-lg"
          >
            {t('startFree')}
          </Link>
          <Link
            href="/auth/login"
            className="btn-secondary text-lg px-8 py-4"
          >
            {t('login')}
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <FeatureCard
            icon="🎮"
            title={t('features.gamification.title')}
            description={t('features.gamification.description')}
          />
          <FeatureCard
            icon={<GemImage size={40} />}
            title={t('features.gems.title')}
            description={t('features.gems.description')}
          />
          <FeatureCard
            icon="📹"
            title={t('features.liveClasses.title')}
            description={t('features.liveClasses.description')}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-text-muted border-t border-border-default">
        <p>{tCommon('copyright', { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string | React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card p-6 text-center hover:scale-105 transition-transform duration-300">
      <div className="text-4xl mb-3 flex justify-center">{icon}</div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary text-sm">{description}</p>
    </div>
  );
}
