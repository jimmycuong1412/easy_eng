'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { Link } from '@/i18n/routing';
import { motion } from 'framer-motion';

import { useTranslations } from 'next-intl';

import { cn, formatNumber } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PixelAvatar } from '@/components/features/PixelAvatar';

// Specialization keys (not translated - these are English category names)
const specializations = [
  'all',
  'Conversation',
  'Business English',
  'IELTS',
  'TOEIC',
  'Kids English',
  'Academic Writing',
  'Pronunciation',
];

const priceRanges = [
  { labelKey: 'priceAll', min: 0, max: Infinity },
  { labelKey: 'priceUnder100k', min: 0, max: 100000 },
  { labelKey: 'price100to200k', min: 100000, max: 200000 },
  { labelKey: 'price200to300k', min: 200000, max: 300000 },
  { labelKey: 'priceOver300k', min: 300000, max: Infinity },
];

const sortOptions = [
  { labelKey: 'sortPopular', value: 'popular' },
  { labelKey: 'sortRating', value: 'rating' },
  { labelKey: 'sortPriceAsc', value: 'price_asc' },
  { labelKey: 'sortPriceDesc', value: 'price_desc' },
];

type Teacher = {
  id: string;
  name: string;
  avatar: string | undefined;
  bio: string;
  specializations: string[];
  languages: string[];
  hourlyRate: number;
  rating: number;
  totalReviews: number;
  totalClasses: number;
  isOnline: boolean;
  isVerified: boolean;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function TeachersPage() {
  const t = useTranslations('teachers');
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedSpecialization, setSelectedSpecialization] = React.useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = React.useState(priceRanges[0]);
  const [selectedSort, setSelectedSort] = React.useState(sortOptions[0]);
  const [showOnlineOnly, setShowOnlineOnly] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    // Retry: on hard page loads the first fetch can be aborted mid-flight
    // while the auth session is still settling.
    const load = async (attempt: number) => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio, role, is_active')
          .eq('role', 'teacher')
          .eq('is_active', true)
          .order('full_name', { ascending: true });

        if (error) throw error;
        if (cancelled) return;

        const mapped: Teacher[] = (data || []).map((t) => ({
          id: t.id as string,
          name: (t.full_name as string) || 'Teacher',
          avatar: (t.avatar_url as string) || undefined,
          bio: (t.bio as string) || '',
          specializations: ['all'],
          languages: ['English', 'Vietnamese'],
          hourlyRate: 200000,
          rating: 0,
          totalReviews: 0,
          totalClasses: 0,
          isOnline: true,
          isVerified: true,
        }));
        setTeachers(mapped);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled && attempt < 3) {
          setTimeout(() => load(attempt + 1), 1500 * (attempt + 1));
          return;
        }
        console.error('Failed to load teachers:', err);
        if (!cancelled) setIsLoading(false);
      }
    };
    load(0);
    return () => { cancelled = true; };
  }, []);

  // Filter and sort teachers
  const filteredTeachers = React.useMemo(() => {
    let result = [...teachers];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.bio.toLowerCase().includes(query) ||
          t.specializations.some((s) => s.toLowerCase().includes(query))
      );
    }

    // Specialization filter — skip if teacher has no specific specs
    if (selectedSpecialization !== 'all') {
      result = result.filter((t) =>
        t.specializations.includes('all') ||
        t.specializations.includes(selectedSpecialization)
      );
    }

    // Price filter
    result = result.filter(
      (t) =>
        t.hourlyRate >= selectedPriceRange.min &&
        t.hourlyRate <= selectedPriceRange.max
    );

    // Online filter
    if (showOnlineOnly) {
      result = result.filter((t) => t.isOnline);
    }

    // Sort
    switch (selectedSort.value) {
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'price_asc':
        result.sort((a, b) => a.hourlyRate - b.hourlyRate);
        break;
      case 'price_desc':
        result.sort((a, b) => b.hourlyRate - a.hourlyRate);
        break;
      case 'popular':
      default:
        result.sort((a, b) => b.totalClasses - a.totalClasses);
        break;
    }

    return result;
  }, [teachers, searchQuery, selectedSpecialization, selectedPriceRange, selectedSort, showOnlineOnly]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
          {t('title')}
        </h1>
        <p className="text-text-secondary mt-1">
          {t('matchCount', { count: filteredTeachers.length })}
        </p>
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              🔍
            </span>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            {/* Specialization filter */}
            <div className="flex flex-wrap gap-2">
              {specializations.map((spec) => (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialization(spec)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    selectedSpecialization === spec
                      ? 'bg-accent-primary text-white'
                      : 'bg-bg-elevated text-text-secondary hover:bg-bg-surface'
                  )}
                >
                  {spec === 'all' ? t('all') : spec}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary filters */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border-default">
            {/* Price range */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">{t('price')}</span>
              <select
                value={priceRanges.findIndex((p) => p === selectedPriceRange)}
                onChange={(e) => setSelectedPriceRange(priceRanges[Number(e.target.value)])}
                className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-border-default text-text-primary text-sm"
              >
                {priceRanges.map((range, i) => (
                  <option key={i} value={i}>
                    {t(range.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">{t('sortBy')}</span>
              <select
                value={sortOptions.findIndex((s) => s === selectedSort)}
                onChange={(e) => setSelectedSort(sortOptions[Number(e.target.value)])}
                className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-border-default text-text-primary text-sm"
              >
                {sortOptions.map((option, i) => (
                  <option key={i} value={i}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Online only toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="w-4 h-4 rounded border-border-default bg-bg-elevated text-accent-primary focus:ring-accent-primary"
              />
              <span className="text-sm text-text-secondary">
                {t('onlineOnly')}
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Teachers grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : filteredTeachers.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredTeachers.map((teacher) => (
            <motion.div key={teacher.id} variants={itemVariants}>
              <TeacherCard teacher={teacher} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-text-muted text-lg mb-4">
            {t('noResults')}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setSelectedSpecialization('all');
              setSelectedPriceRange(priceRanges[0]);
              setShowOnlineOnly(false);
            }}
          >
            {t('clearFilters')}
          </Button>
        </Card>
      )}
    </div>
  );
}

function TeacherCard({ teacher }: { teacher: Teacher }) {
  const t = useTranslations('teachers');
  return (
    <Link href={`/dashboard/teachers/${teacher.id}`}>
      <Card variant="interactive" className="h-full overflow-hidden">
        <CardContent className="p-0">
          {/* Header with avatar */}
          <div className="relative p-4 bg-gradient-to-b from-bg-elevated to-transparent">
            <div className="flex items-start gap-4">
              <div className="relative">
                <PixelAvatar
                  src={teacher.avatar}
                  fallbackEmoji="👨‍🏫"
                  size="lg"
                  showLevel={false}
                />
                {teacher.isOnline && (
                  <span className="absolute bottom-0 right-0 w-4 h-4 bg-success rounded-full border-2 border-bg-surface" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-text-primary truncate">
                    {teacher.name}
                  </h3>
                  {teacher.isVerified && (
                    <span title="Verified" className="text-accent-primary">
                      ✓
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-accent-gold">⭐</span>
                  <span className="text-sm font-medium text-text-primary">
                    {teacher.rating}
                  </span>
                  <span className="text-sm text-text-muted">
                    ({t('reviews', { count: teacher.totalReviews })})
                  </span>
                </div>
                <p className="text-sm text-text-muted mt-1">
                  {t('totalClasses', { count: teacher.totalClasses })}
                </p>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="px-4 pb-4">
            <p className="text-sm text-text-secondary line-clamp-2">
              {teacher.bio}
            </p>

            {/* Specializations */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {teacher.specializations.slice(0, 3).map((spec) => (
                <Badge key={spec} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>

            {/* Languages */}
            <div className="flex items-center gap-1 mt-3 text-sm text-text-muted">
              <span>🗣️</span>
              <span>{teacher.languages.join(', ')}</span>
            </div>

            {/* Price and CTA */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-default">
              <div>
                <p className="text-lg font-bold text-accent-primary">
                  {formatNumber(teacher.hourlyRate)}đ
                </p>
                <p className="text-xs text-text-muted">{t('perSession')}</p>
              </div>
              <Button size="sm">{t('viewDetails')}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
