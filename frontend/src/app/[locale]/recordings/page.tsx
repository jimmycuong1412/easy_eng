'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Video,
  Play,
  Download,
  Calendar,
  Clock,
  Search,
  Filter,
  PlayCircle,
  Loader2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations, useLocale } from 'next-intl';
import { getUserRecordings } from '@/lib/queries';

interface RecordingItem {
  id: string;
  classId: string;
  topic: string;
  teacher: {
    name: string;
    avatar: string;
  };
  recordedAt: string;
  duration: number;
  thumbnail: string;
  expiresAt: string;
  watched: boolean;
  watchedProgress: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function RecordingsPage() {
  const { user } = useAuth();
  const t = useTranslations('recordings');
  const locale = useLocale();
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterTeacher, setFilterTeacher] = React.useState('all');

  useEffect(() => {
    if (!user?.id) return;

    const fetchRecordings = async () => {
      try {
        setLoading(true);
        const data = await getUserRecordings(user.id) as Record<string, unknown>[] | null;

        const mapped: RecordingItem[] = (data || []).map((r) => {
          const cls = r.classes as Record<string, unknown> | null;
          const recordedAt = (r.scheduled_start_time as string) || '';
          const expiresDate = new Date(recordedAt);
          expiresDate.setDate(expiresDate.getDate() + 30);

          return {
            id: r.id as string,
            classId: (r.class_id as string) || '',
            topic: (cls?.title as string) || 'Untitled Recording',
            teacher: {
              name: 'Teacher',
              avatar: '',
            },
            recordedAt,
            duration: (r.duration_minutes as number) || 25,
            thumbnail: '',
            expiresAt: expiresDate.toISOString(),
            watched: false,
            watchedProgress: 0,
          };
        });

        setRecordings(mapped);
      } catch (err) {
        console.error('Error fetching recordings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecordings();
  }, [user?.id]);

  const filteredRecordings = recordings.filter((recording) => {
    const matchesSearch = recording.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeacher =
      filterTeacher === 'all' || recording.teacher.name === filterTeacher;
    return matchesSearch && matchesTeacher;
  });

  const uniqueTeachers = Array.from(new Set(recordings.map((r) => r.teacher.name)));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-white mb-2">{t('title')}</h1>
          <p className="text-slate-400">{t('subtitle')}</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Video className="w-8 h-8 text-[#3B82F6] mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{recordings.length}</p>
              <p className="text-sm text-slate-400">{t('stats.total')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <PlayCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {recordings.filter((r) => r.watchedProgress === 100).length}
              </p>
              <p className="text-sm text-slate-400">{t('stats.watched')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {recordings.filter((r) => !r.watched).length}
              </p>
              <p className="text-sm text-slate-400">{t('stats.unwatched')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {recordings.reduce((acc, r) => acc + r.duration, 0)}
              </p>
              <p className="text-sm text-slate-400">{t('stats.totalMinutes')}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col md:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>
          <Select value={filterTeacher} onValueChange={setFilterTeacher}>
            <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 text-white">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder={t('filterTeacher')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTeachers')}</SelectItem>
              {uniqueTeachers.map((teacher) => (
                <SelectItem key={teacher} value={teacher}>
                  {teacher}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Recordings Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredRecordings.map((recording) => {
            const daysUntilExpiry = getDaysUntilExpiry(recording.expiresAt);

            return (
              <motion.div key={recording.id} variants={itemVariants}>
                <Card className="bg-white/5 border-white/10 overflow-hidden hover:border-[#3B82F6]/50 transition-all group">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-slate-800 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="w-12 h-12 text-slate-600" />
                    </div>

                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-[#3B82F6] flex items-center justify-center">
                        <Play className="w-8 h-8 text-white ml-1" />
                      </div>
                    </div>

                    {/* Duration badge */}
                    <Badge className="absolute bottom-2 right-2 bg-black/70 text-white border-0">
                      {recording.duration} {t('minutes')}
                    </Badge>

                    {/* Progress bar */}
                    {recording.watchedProgress > 0 && recording.watchedProgress < 100 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700">
                        <div
                          className="h-full bg-[#3B82F6]"
                          style={{ width: `${recording.watchedProgress}%` }}
                        />
                      </div>
                    )}

                    {/* Watched badge */}
                    {recording.watchedProgress === 100 && (
                      <Badge className="absolute top-2 right-2 bg-emerald-500/80 text-white border-0">
                        {t('watched')}
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-4">
                    {/* Topic */}
                    <h3 className="font-semibold text-white mb-2 line-clamp-2">
                      {recording.topic}
                    </h3>

                    {/* Teacher */}
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={recording.teacher.avatar} />
                        <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6] text-xs">
                          {recording.teacher.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-slate-400">{recording.teacher.name}</span>
                    </div>

                    {/* Date and expiry */}
                    <div className="flex items-center justify-between text-xs mb-4">
                      <span className="text-slate-500">
                        {formatDate(recording.recordedAt)}
                      </span>
                      <span
                        className={`${
                          daysUntilExpiry <= 7 ? 'text-amber-400' : 'text-slate-500'
                        }`}
                      >
                        {t('expiresIn', { days: daysUntilExpiry })}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link href={`/class/${recording.classId}/materials?tab=recording`} className="flex-1">
                        <Button className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90">
                          <Play className="w-4 h-4 mr-1" />
                          {t('watchBtn')}
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-white/20 text-white"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Empty State */}
        {filteredRecordings.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Video className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">{t('empty.title')}</h3>
            <p className="text-slate-400">{t('empty.desc')}</p>
          </motion.div>
        )}

        {/* Info Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-4">
              <p className="text-sm text-amber-400">
                💡 {t('retentionNote')}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
