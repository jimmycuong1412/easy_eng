'use client';

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
  ChevronDown,
  X,
  Cookie,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

// Mock data - will be replaced with Supabase data
const mockClasses = [
  {
    id: '1',
    topic: 'Business English: Meeting Skills',
    description: 'Learn professional vocabulary and phrases for effective meetings.',
    teacherName: 'Nguyễn Minh Anh',
    teacherAvatar: '/avatars/teacher1.png',
    teacherRating: 4.9,
    scheduledAt: '2026-01-23T09:00:00+07:00',
    duration: 25,
    capacity: 8,
    enrolledCount: 5,
    priceUsd: 8,
    priceVnd: 200000,
    level: 'Intermediate',
    category: 'Business',
  },
  {
    id: '2',
    topic: 'IELTS Speaking Part 2: Describe a Place',
    description: 'Practice describing places with fluency and coherence.',
    teacherName: 'Trần Hải Đăng',
    teacherAvatar: '/avatars/teacher2.png',
    teacherRating: 4.8,
    scheduledAt: '2026-01-23T14:00:00+07:00',
    duration: 25,
    capacity: 6,
    enrolledCount: 4,
    priceUsd: 10,
    priceVnd: 250000,
    level: 'Advanced',
    category: 'IELTS',
  },
  {
    id: '3',
    topic: 'Everyday Conversations: At the Restaurant',
    description: 'Common phrases and vocabulary for dining situations.',
    teacherName: 'Lê Thu Hà',
    teacherAvatar: '/avatars/teacher3.png',
    teacherRating: 4.9,
    scheduledAt: '2026-01-23T19:00:00+07:00',
    duration: 25,
    capacity: 10,
    enrolledCount: 2,
    priceUsd: 5,
    priceVnd: 125000,
    level: 'Beginner',
    category: 'Conversation',
  },
  {
    id: '4',
    topic: 'Grammar Focus: Conditional Sentences',
    description: 'Master all types of conditional sentences with examples.',
    teacherName: 'Phạm Quang Huy',
    teacherAvatar: '/avatars/teacher4.png',
    teacherRating: 4.7,
    scheduledAt: '2026-01-24T10:00:00+07:00',
    duration: 25,
    capacity: 12,
    enrolledCount: 8,
    priceUsd: 6,
    priceVnd: 150000,
    level: 'Intermediate',
    category: 'Grammar',
  },
  {
    id: '5',
    topic: 'Pronunciation Workshop: American Accent',
    description: 'Improve your American English pronunciation and intonation.',
    teacherName: 'Võ Ngọc Lan',
    teacherAvatar: '/avatars/teacher5.png',
    teacherRating: 4.8,
    scheduledAt: '2026-01-24T15:00:00+07:00',
    duration: 25,
    capacity: 6,
    enrolledCount: 6,
    priceUsd: 12,
    priceVnd: 300000,
    level: 'All Levels',
    category: 'Pronunciation',
  },
  {
    id: '6',
    topic: 'TOEIC Listening Practice',
    description: 'Practice listening comprehension with real TOEIC questions.',
    teacherName: 'Nguyễn Minh Anh',
    teacherAvatar: '/avatars/teacher1.png',
    teacherRating: 4.9,
    scheduledAt: '2026-01-25T09:00:00+07:00',
    duration: 25,
    capacity: 15,
    enrolledCount: 10,
    priceUsd: 7,
    priceVnd: 175000,
    level: 'Intermediate',
    category: 'TOEIC',
  },
];

const categories = ['Tất cả', 'Business', 'IELTS', 'TOEIC', 'Conversation', 'Grammar', 'Pronunciation'];
const levels = ['Tất cả', 'Beginner', 'Intermediate', 'Advanced', 'All Levels'];
const priceRanges = [
  { label: 'Tất cả', min: 0, max: Infinity },
  { label: 'Dưới 150K', min: 0, max: 150000 },
  { label: '150K - 250K', min: 150000, max: 250000 },
  { label: 'Trên 250K', min: 250000, max: Infinity },
];

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

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

export default function ClassCatalogPage() {
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState({
    category: 'Tất cả',
    level: 'Tất cả',
    priceRange: 0,
  });

  // Filter classes based on search and filters
  const filteredClasses = mockClasses.filter((classItem) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        classItem.topic.toLowerCase().includes(query) ||
        classItem.teacherName.toLowerCase().includes(query) ||
        classItem.description.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (filters.category !== 'Tất cả' && classItem.category !== filters.category) {
      return false;
    }

    // Level filter
    if (filters.level !== 'Tất cả' && classItem.level !== filters.level) {
      return false;
    }

    // Price filter
    const priceRange = priceRanges[filters.priceRange];
    if (classItem.priceVnd < priceRange.min || classItem.priceVnd > priceRange.max) {
      return false;
    }

    return true;
  });

  const clearFilters = () => {
    setFilters({
      category: 'Tất cả',
      level: 'Tất cả',
      priceRange: 0,
    });
    setSearchQuery('');
  };

  const hasActiveFilters =
    filters.category !== 'Tất cả' ||
    filters.level !== 'Tất cả' ||
    filters.priceRange !== 0 ||
    searchQuery !== '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Khám phá lớp học 📚</h1>
          <p className="text-slate-400">
            Tìm lớp học phù hợp với trình độ và mục tiêu của bạn
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 space-y-4"
        >
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm theo chủ đề, giáo viên..."
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
              Bộ lọc
              {hasActiveFilters && (
                <Badge className="ml-2 bg-[#3B82F6] text-white">
                  {[filters.category !== 'Tất cả', filters.level !== 'Tất cả', filters.priceRange !== 0].filter(Boolean).length}
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
                    <label className="text-sm text-slate-400 mb-3 block">Danh mục</label>
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
                    <label className="text-sm text-slate-400 mb-3 block">Trình độ</label>
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
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Filter */}
                  <div>
                    <label className="text-sm text-slate-400 mb-3 block">Mức giá</label>
                    <div className="flex flex-wrap gap-2">
                      {priceRanges.map((range, index) => (
                        <button
                          key={index}
                          onClick={() => setFilters((f) => ({ ...f, priceRange: index }))}
                          className={`px-4 py-2 rounded-full text-sm transition-colors ${
                            filters.priceRange === index
                              ? 'bg-amber-500 text-white'
                              : 'bg-white/10 text-slate-300 hover:bg-white/20'
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Xóa bộ lọc
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
            Tìm thấy <span className="text-white font-medium">{filteredClasses.length}</span> lớp học
          </p>
          <select className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-[#3B82F6]">
            <option value="date">Sắp xếp: Sắp diễn ra</option>
            <option value="price-asc">Giá: Thấp đến cao</option>
            <option value="price-desc">Giá: Cao đến thấp</option>
            <option value="rating">Đánh giá cao nhất</option>
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
            {filteredClasses.map((classItem) => (
              <motion.div key={classItem.id} variants={itemVariants}>
                <Link href={`/classes/${classItem.id}`}>
                  <Card className={`bg-white/5 border-white/10 hover:border-[#3B82F6]/50 hover:bg-white/10 transition-all cursor-pointer group ${viewMode === 'list' ? 'flex' : ''}`}>
                    <CardContent className={`p-5 ${viewMode === 'list' ? 'flex items-center gap-6 w-full' : ''}`}>
                      {/* Teacher Info */}
                      <div className={`flex items-center gap-3 ${viewMode === 'list' ? 'min-w-[200px]' : 'mb-4'}`}>
                        <Avatar className="h-10 w-10 border-2 border-[#3B82F6]/30">
                          <AvatarImage src={classItem.teacherAvatar} />
                          <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6]">
                            {classItem.teacherName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-white">{classItem.teacherName}</p>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs text-slate-400">{classItem.teacherRating}</span>
                          </div>
                        </div>
                      </div>

                      {/* Class Info */}
                      <div className={viewMode === 'list' ? 'flex-1' : ''}>
                        <h3 className="font-semibold text-white group-hover:text-[#3B82F6] transition-colors line-clamp-2 mb-2">
                          {classItem.topic}
                        </h3>
                        {viewMode === 'grid' && (
                          <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                            {classItem.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge variant="outline" className="border-[#3B82F6]/30 text-[#3B82F6]">
                            {classItem.category}
                          </Badge>
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                            {classItem.level}
                          </Badge>
                        </div>
                      </div>

                      {/* Schedule & Price */}
                      <div className={viewMode === 'list' ? 'flex items-center gap-8' : ''}>
                        <div className={`flex items-center gap-4 text-sm text-slate-400 ${viewMode === 'list' ? '' : 'mb-4'}`}>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(classItem.scheduledAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(classItem.scheduledAt)}</span>
                          </div>
                        </div>

                        <div className={`flex items-center justify-between ${viewMode === 'list' ? 'min-w-[180px]' : ''}`}>
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span className={classItem.enrolledCount >= classItem.capacity ? 'text-red-400' : 'text-slate-400'}>
                              {classItem.enrolledCount}/{classItem.capacity}
                            </span>
                            {classItem.enrolledCount >= classItem.capacity && (
                              <Badge className="bg-red-500/20 text-red-400 border-0">Hết chỗ</Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-white">{formatVND(classItem.priceVnd)}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Cookie className="w-3 h-3" />
                              Có thể dùng Cookies
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
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
            <h3 className="text-xl font-semibold text-white mb-2">Không tìm thấy lớp học</h3>
            <p className="text-slate-400 mb-4">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            <Button onClick={clearFilters} className="bg-[#3B82F6] hover:bg-[#3B82F6]/90">
              Xóa bộ lọc
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
