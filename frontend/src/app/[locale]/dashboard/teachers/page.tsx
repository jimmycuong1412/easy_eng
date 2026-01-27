'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { cn, formatNumber } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PixelAvatar } from '@/components/features/PixelAvatar';

// Filter options
const specializations = [
  'Tất cả',
  'Conversation',
  'Business English',
  'IELTS',
  'TOEIC',
  'Kids English',
  'Academic Writing',
  'Pronunciation',
];

const priceRanges = [
  { label: 'Tất cả', min: 0, max: Infinity },
  { label: 'Dưới 100k', min: 0, max: 100000 },
  { label: '100k - 200k', min: 100000, max: 200000 },
  { label: '200k - 300k', min: 200000, max: 300000 },
  { label: 'Trên 300k', min: 300000, max: Infinity },
];

const sortOptions = [
  { label: 'Phổ biến nhất', value: 'popular' },
  { label: 'Đánh giá cao', value: 'rating' },
  { label: 'Giá thấp nhất', value: 'price_asc' },
  { label: 'Giá cao nhất', value: 'price_desc' },
];

// Mock data
const mockTeachers = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: null,
    bio: 'Native English speaker with 5+ years of teaching experience. Specializing in Business English and interview preparation.',
    specializations: ['Business English', 'Conversation', 'IELTS'],
    languages: ['English', 'Vietnamese (Basic)'],
    hourlyRate: 180000,
    rating: 4.9,
    totalReviews: 128,
    totalClasses: 450,
    isOnline: true,
    isVerified: true,
  },
  {
    id: '2',
    name: 'Michael Chen',
    avatar: null,
    bio: 'IELTS certified examiner. Helped 200+ students achieve their target scores. Fluent in English and Mandarin.',
    specializations: ['IELTS', 'TOEIC', 'Academic Writing'],
    languages: ['English', 'Mandarin', 'Vietnamese'],
    hourlyRate: 220000,
    rating: 4.95,
    totalReviews: 256,
    totalClasses: 820,
    isOnline: false,
    isVerified: true,
  },
  {
    id: '3',
    name: 'Emily Davis',
    avatar: null,
    bio: 'Fun and engaging lessons for kids! I make learning English an adventure with games and interactive activities.',
    specializations: ['Kids English', 'Conversation', 'Pronunciation'],
    languages: ['English'],
    hourlyRate: 120000,
    rating: 5.0,
    totalReviews: 89,
    totalClasses: 310,
    isOnline: true,
    isVerified: true,
  },
  {
    id: '4',
    name: 'James Wilson',
    avatar: null,
    bio: 'TOEIC specialist with proven track record. Average score improvement of 150+ points for my students.',
    specializations: ['TOEIC', 'Business English', 'Academic Writing'],
    languages: ['English', 'Japanese'],
    hourlyRate: 200000,
    rating: 4.8,
    totalReviews: 167,
    totalClasses: 580,
    isOnline: true,
    isVerified: true,
  },
  {
    id: '5',
    name: 'Lisa Park',
    avatar: null,
    bio: 'Patient and friendly teacher. Perfect for beginners who want to build confidence in speaking English.',
    specializations: ['Conversation', 'Pronunciation', 'Kids English'],
    languages: ['English', 'Korean', 'Vietnamese'],
    hourlyRate: 150000,
    rating: 4.85,
    totalReviews: 92,
    totalClasses: 340,
    isOnline: false,
    isVerified: false,
  },
  {
    id: '6',
    name: 'David Thompson',
    avatar: null,
    bio: 'British accent specialist. Former BBC journalist. Teaching proper pronunciation and British English idioms.',
    specializations: ['Pronunciation', 'Business English', 'Conversation'],
    languages: ['English'],
    hourlyRate: 250000,
    rating: 4.92,
    totalReviews: 78,
    totalClasses: 290,
    isOnline: true,
    isVerified: true,
  },
];

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
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedSpecialization, setSelectedSpecialization] = React.useState('Tất cả');
  const [selectedPriceRange, setSelectedPriceRange] = React.useState(priceRanges[0]);
  const [selectedSort, setSelectedSort] = React.useState(sortOptions[0]);
  const [showOnlineOnly, setShowOnlineOnly] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Filter and sort teachers
  const filteredTeachers = React.useMemo(() => {
    let result = [...mockTeachers];

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

    // Specialization filter
    if (selectedSpecialization !== 'Tất cả') {
      result = result.filter((t) =>
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
  }, [searchQuery, selectedSpecialization, selectedPriceRange, selectedSort, showOnlineOnly]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
          Tìm giáo viên
        </h1>
        <p className="text-text-secondary mt-1">
          {filteredTeachers.length} giáo viên phù hợp
        </p>
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Tìm theo tên, chuyên môn..."
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
                  {spec}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary filters */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border-default">
            {/* Price range */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">Giá:</span>
              <select
                value={priceRanges.findIndex((p) => p === selectedPriceRange)}
                onChange={(e) => setSelectedPriceRange(priceRanges[Number(e.target.value)])}
                className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-border-default text-text-primary text-sm"
              >
                {priceRanges.map((range, i) => (
                  <option key={i} value={i}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">Sắp xếp:</span>
              <select
                value={sortOptions.findIndex((s) => s === selectedSort)}
                onChange={(e) => setSelectedSort(sortOptions[Number(e.target.value)])}
                className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-border-default text-text-primary text-sm"
              >
                {sortOptions.map((option, i) => (
                  <option key={i} value={i}>
                    {option.label}
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
                Chỉ hiện online
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
            Không tìm thấy giáo viên phù hợp
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setSelectedSpecialization('Tất cả');
              setSelectedPriceRange(priceRanges[0]);
              setShowOnlineOnly(false);
            }}
          >
            Xóa bộ lọc
          </Button>
        </Card>
      )}
    </div>
  );
}

function TeacherCard({ teacher }: { teacher: (typeof mockTeachers)[0] }) {
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
                    ({teacher.totalReviews} đánh giá)
                  </span>
                </div>
                <p className="text-sm text-text-muted mt-1">
                  {teacher.totalClasses} lớp học
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
                <p className="text-xs text-text-muted">/ 25 phút</p>
              </div>
              <Button size="sm">Xem chi tiết</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
