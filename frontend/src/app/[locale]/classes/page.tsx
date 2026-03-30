'use client';

export const dynamic = 'force-dynamic';
// v2
import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  Clock,
  Users,
  Star,
  X,
  Gem,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getSupabaseClient } from '@/lib/supabase/client';

// Animation variants
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

interface ClassWithTeacher {
  id: string;
  title: string;
  description: string | null;
  level: string;
  price: number;
  currency: string;
  start_time: string;
  duration_minutes: number;
  max_students: number;
  current_enrollments: number;
  status: string;
  tags: string[] | null;
  is_active: boolean;
  teacher_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    average_rating?: number;
    total_reviews?: number;
  } | null;
}

const categories = ['All', 'Business', 'IELTS', 'TOEIC', 'Conversation', 'Grammar', 'Pronunciation'];
const levels = ['All', 'beginner', 'intermediate', 'advanced'];

const priceRanges = [
  { labelKey: 'levelAll', min: 0, max: Infinity },
  { labelKey: 'under150k', min: 0, max: 150000 },
  { labelKey: '150k250k', min: 150000, max: 250000 },
  { labelKey: 'over250k', min: 250000, max: Infinity },
];

const priceRangeLabels: Record<string, { en: string; vi: string }> = {
  under150k: { en: 'Under 150K', vi: 'Dưới 150K' },
  '150k250k': { en: '150K - 250K', vi: '150K - 250K' },
  over250k: { en: 'Over 250K', vi: 'Trên 250K' },
};


function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getCategoryFromTags(tags: string[] | null): string {
  if (!tags || tags.length === 0) return 'General';
  const tag = tags[0];
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

export default function ClassCatalogPage() {
  const t = useTranslations('classes');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState({
    category: 'All',
    level: 'All',
    priceRange: 0,
  });

  const [classes, setClasses] = React.useState<ClassWithTeacher[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const levelLabels: Record<string, string> = {
    'All': t('levelAll'),
    'beginner': t('levelBeginner'),
    'elementary': t('levelElementary'),
    'intermediate': t('levelIntermediate'),
    'upper_intermediate': t('levelUpperIntermediate'),
    'advanced': t('levelAdvanced'),
  };

  // Fetch classes from Supabase
  React.useEffect(() => {
    async function fetchClasses() {
      try {
        setLoading(true);
        setError(null);
        const supabase = getSupabaseClient();

        const { data, error: fetchError } = await supabase
          .from('classes')
          .select('*, profiles!classes_teacher_id_profiles_fkey(full_name, avatar_url, bio)')
          .eq('is_active', true)
          .in('status', ['scheduled', 'draft'])
          .order('start_time', { ascending: true });

        if (fetchError) throw fetchError;
        setClasses((data as ClassWithTeacher[]) || []);
      } catch (err) {
        console.error('Failed to fetch classes:', err);
        setError(err instanceof Error ? err.message : t('loadFailed'));
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, []);

  // Filter classes based on search and filters
  const filteredClasses = classes.filter((classItem) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const teacherName = classItem.profiles?.full_name || '';
      const matchesSearch =
        classItem.title.toLowerCase().includes(query) ||
        teacherName.toLowerCase().includes(query) ||
        (classItem.description || '').toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (filters.category !== 'All') {
      const classCategory = getCategoryFromTags(classItem.tags);
      if (classCategory.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }
    }

    if (filters.level !== 'All' && classItem.level !== filters.level) {
      return false;
    }

    const priceRange = priceRanges[filters.priceRange];
    if (priceRange && (classItem.price < priceRange.min || classItem.price > priceRange.max)) {
      return false;
    }

    return true;
  });

  const clearFilters = () => {
    setFilters({ category: 'All', level: 'All', priceRange: 0 });
    setSearchQuery('');
  };

  const hasActiveFilters =
    filters.category !== 'All' ||
    filters.level !== 'All' ||
    filters.priceRange !== 0 ||
    searchQuery !== '';

  const getPriceRangeLabel = (index: number): string => {
    if (index === 0) return t('levelAll');
    const key = priceRanges[index].labelKey;
    return priceRangeLabels[key]?.en ?? key;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
          <p className="text-slate-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">{t('loadFailed')}</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
          >
            {t('tryAgain')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
          <p className="text-slate-400">{t('subtitle')}</p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 space-y-4"
        >
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-[#3B82F6]"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-12 px-6 border-white/20 ${showFilters ? 'bg-[#3B82F6] text-white border-[#3B82F6]' : 'text-white hover:bg-white/10'}`}
            >
              <Filter className="w-5 h-5 mr-2" />
              {t('filters')}
              {hasActiveFilters && (
                <Badge className="ml-2 bg-[#3B82F6] text-white">
                  {[filters.category !== 'All', filters.level !== 'All', filters.priceRange !== 0].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            <div className="flex border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 transition-colors ${viewMode === 'grid' ? 'bg-[#3B82F6] text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 transition-colors ${viewMode === 'list' ? 'bg-[#3B82F6] text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-6">
                  {/* Category Filter */}
                  <div>
                    <label className="text-sm text-slate-400 mb-3 block">{t('category')}</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => setFilters((f) => ({ ...f, category }))}
                          className={`px-4 py-2 rounded-full text-sm transition-colors ${
                            filters.category === category
                              ? 'bg-[#3B82F6] text-white'
                              : 'bg-white/10 text-slate-300 hover:bg-white/20'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Level Filter */}
                  <div>
                    <label className="text-sm text-slate-400 mb-3 block">{t('level')}</label>
                    <div className="flex flex-wrap gap-2">
                      {levels.map((level) => (
                        <button
                          key={level}
                          onClick={() => setFilters((f) => ({ ...f, level }))}
                          className={`px-4 py-2 rounded-full text-sm transition-colors ${
                            filters.level === level
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white/10 text-slate-300 hover:bg-white/20'
                          }`}
                        >
                          {levelLabels[level] || level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Filter */}
                  <div>
                    <label className="text-sm text-slate-400 mb-3 block">{t('priceRange')}</label>
                    <div className="flex flex-wrap gap-2">
                      {priceRanges.map((_range, index) => (
                        <button
                          key={index}
                          onClick={() => setFilters((f) => ({ ...f, priceRange: index }))}
                          className={`px-4 py-2 rounded-full text-sm transition-colors ${
                            filters.priceRange === index
                              ? 'bg-amber-500 text-white'
                              : 'bg-white/10 text-slate-300 hover:bg-white/20'
                          }`}
                        >
                          {getPriceRangeLabel(index)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t('clearFilters')}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results Count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4 flex items-center justify-between"
        >
          <p className="text-slate-400">
            {t('found', { count: filteredClasses.length })}
          </p>
          <select className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6]">
            <option value="date">{t('sortUpcoming')}</option>
            <option value="price-asc">{t('sortPriceLow')}</option>
            <option value="price-desc">{t('sortPriceHigh')}</option>
            <option value="rating">{t('sortRating')}</option>
          </select>
        </motion.div>

        {/* Class Grid/List */}
        {filteredClasses.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}
          >
            {filteredClasses.map((classItem) => {
              const teacherName = classItem.profiles?.full_name || 'Unknown Teacher';
              const teacherAvatar = classItem.profiles?.avatar_url || '';
              const teacherRating = classItem.profiles?.average_rating || 0;
              const category = getCategoryFromTags(classItem.tags);

              return (
                <motion.div key={classItem.id} variants={itemVariants}>
                  <Link href={`/classes/${classItem.id}`}>
                    <Card className={`bg-white/5 border-white/10 hover:border-[#3B82F6]/50 hover:bg-white/10 transition-all cursor-pointer group ${viewMode === 'list' ? 'flex' : ''}`}>
                      <CardContent className={`p-5 ${viewMode === 'list' ? 'flex items-center gap-6 w-full' : ''}`}>
                        {/* Teacher Info */}
                        <div className={`flex items-center gap-3 ${viewMode === 'list' ? 'min-w-[200px]' : 'mb-4'}`}>
                          <Avatar className="h-10 w-10 border-2 border-[#3B82F6]/30">
                            <AvatarImage src={teacherAvatar} />
                            <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6]">
                              {teacherName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-white">{teacherName}</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-xs text-slate-400">{teacherRating > 0 ? teacherRating.toFixed(1) : 'New'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Class Info */}
                        <div className={viewMode === 'list' ? 'flex-1' : ''}>
                          <h3 className="font-semibold text-white group-hover:text-[#3B82F6] transition-colors line-clamp-2 mb-2">
                            {classItem.title}
                          </h3>
                          {viewMode === 'grid' && (
                            <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                              {classItem.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge variant="outline" className="border-[#3B82F6]/30 text-[#3B82F6]">
                              {category}
                            </Badge>
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                              {levelLabels[classItem.level] || classItem.level}
                            </Badge>
                          </div>
                        </div>

                        {/* Schedule & Price */}
                        <div className={viewMode === 'list' ? 'flex items-center gap-8' : ''}>
                          <div className={`flex items-center gap-4 text-sm text-slate-400 ${viewMode === 'list' ? '' : 'mb-4'}`}>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(classItem.start_time)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatTime(classItem.start_time)}</span>
                            </div>
                          </div>

                          <div className={`flex items-center justify-between ${viewMode === 'list' ? 'min-w-[180px]' : ''}`}>
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-slate-400" />
                              <span className={classItem.current_enrollments >= classItem.max_students ? 'text-red-400' : 'text-slate-400'}>
                                {classItem.current_enrollments}/{classItem.max_students}
                              </span>
                              {classItem.current_enrollments >= classItem.max_students && (
                                <Badge className="bg-red-500/20 text-red-400 border-0">{t('full')}</Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                <Gem className="w-4 h-4 text-amber-400" />
                                <p className="text-lg font-bold text-amber-400">100 Gems</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <Search className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('noResults')}</h3>
            <p className="text-slate-400 mb-4">{t('noResultsHint')}</p>
            <Button onClick={clearFilters} className="bg-[#3B82F6] hover:bg-[#3B82F6]/90">
              {t('clearFilters')}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
