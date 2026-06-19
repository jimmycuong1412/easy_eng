'use client';

export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function SettingsNotificationsPage() {
  const locale = useLocale();
  redirect(`/${locale}/notifications`);
}
