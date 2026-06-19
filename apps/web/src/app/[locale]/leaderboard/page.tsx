'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Medal,
  Crown,
  Filter,
  ChevronDown,
} from 'lucide-react';

import { formatNumber } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuth } from '@/hooks/useAuth';
import { getLeaderboard } from '@/lib/queries';

type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  streak: number;
  classes: number;
  careerAvatar: string;
  isCurrentUser?: boolean;
};

const careerAvatarColors: Record<string, string> = {
  'Business Pro': 'from-blue-500 to-indigo-600',
  'Global Citizen': 'from-emerald-500 to-teal-600',
  'Academic Achiever': 'from-purple-500 to-violet-600',
  'Corporate Leader': 'from-slate-600 to-gray-700',
  'Wanderlust': 'from-orange-500 to-amber-600',
  'Healthcare Hero': 'from-red-500 to-rose-600',
  'Legal Expert': 'from-amber-600 to-yellow-700',
  'Tech Innovator': 'from-cyan-500 to-blue-600',
};

function getRankBadge(rank: number) {
  if (rank === 1) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
        <Crown className="w-5 h-5 text-white" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shadow-lg shadow-slate-400/30">
        <Medal className="w-5 h-5 text-white" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-700/30">
        <Medal className="w-5 h-5 text-white" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold text-slate-400">
      {rank}
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const t = useTranslations('leaderboard');
  const [filter, setFilter] = React.useState<'all' | string>('all');
  const [leaderboardData, setLeaderboardData] = React.useState<LeaderboardEntry[]>([]);

  React.useEffect(() => {
    getLeaderboard(50)
      .then((data) => {
        const mapped: LeaderboardEntry[] = (data || []).map((entry: Record<string, unknown>, index: number) => {
          const profile = entry.profiles as Record<string, unknown> | undefined;
          const career = entry.career_paths as Record<string, unknown> | undefined;
          return {
            rank: index + 1,
            userId: (entry.student_id as string) || '',
            name: (profile?.full_name as string) || 'Student',
            avatar: (profile?.avatar_url as string) || '',
            level: (entry.current_level as number) || 1,
            xp: (entry.total_xp_earned as number) || 0,
            streak: (entry.current_streak as number) || 0,
            classes: 0,
            careerAvatar: (career?.name as string) || 'Student',
            isCurrentUser: (entry.student_id as string) === user?.id,
          };
        });
        setLeaderboardData(mapped);
      })
      .catch(console.error);
  }, [user?.id]);

  // Use data for all tabs (same data, different label context)
  const mockLeaderboardData = {
    weekly: leaderboardData,
    monthly: leaderboardData,
    allTime: leaderboardData.slice(0, 10),
  };

  const currentUserWeeklyRank = mockLeaderboardData.weekly.find((u) => u.isCurrentUser);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 mb-4">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
        <p className="text-slate-400">{t('subtitle')}</p>
      </motion.div>

      {/* Current User Stats */}
      {currentUserWeeklyRank && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-r from-[#3B82F6]/20 to-purple-500/20 border-[#3B82F6]/30 mb-6">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16 border-2 border-[#3B82F6]">
                      <AvatarImage src={currentUserWeeklyRank.avatar} />
                      <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6] text-xl">
                        B
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#3B82F6] flex items-center justify-center text-xs font-bold text-white">
                      {currentUserWeeklyRank.level}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{t('yourRank')}</h3>
                    <p className="text-slate-400">
                      <span className="text-[#3B82F6] font-semibold">#{currentUserWeeklyRank.rank}</span> {t('thisWeek')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold text-amber-400">{formatNumber(currentUserWeeklyRank.xp)}</p>
                    <p className="text-xs text-slate-400">{t('weeklyXP')}</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-orange-400">{currentUserWeeklyRank.streak}</p>
                    <p className="text-xs text-slate-400">{t('streak')}</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-400">{currentUserWeeklyRank.classes}</p>
                    <p className="text-xs text-slate-400">{t('classes')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="weekly" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="weekly" className="data-[state=active]:bg-[#3B82F6]">
              {t('tabWeekly')}
            </TabsTrigger>
            <TabsTrigger value="monthly" className="data-[state=active]:bg-[#3B82F6]">
              {t('tabMonthly')}
            </TabsTrigger>
            <TabsTrigger value="allTime" className="data-[state=active]:bg-[#3B82F6]">
              {t('tabAllTime')}
            </TabsTrigger>
          </TabsList>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-white/20 text-white">
                <Filter className="w-4 h-4 mr-2" />
                {filter === 'all' ? t('filterAll') : filter}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1E3A5F] border-white/10">
              <DropdownMenuItem onClick={() => setFilter('all')}>{t('filterAll')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('Business Pro')}>Business Pro</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('Academic Achiever')}>Academic Achiever</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('Tech Innovator')}>Tech Innovator</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('Global Citizen')}>Global Citizen</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Weekly Tab */}
        <TabsContent value="weekly">
          <LeaderboardList data={mockLeaderboardData.weekly} streakLabel={t('streakUnit')} classLabel={t('classUnit')} />
        </TabsContent>

        {/* Monthly Tab */}
        <TabsContent value="monthly">
          <LeaderboardList data={mockLeaderboardData.monthly} streakLabel={t('streakUnit')} classLabel={t('classUnit')} />
        </TabsContent>

        {/* All Time Tab */}
        <TabsContent value="allTime">
          <LeaderboardList data={mockLeaderboardData.allTime} showTopOnly streakLabel={t('streakUnit')} classLabel={t('classUnit')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderboardList({
  data,
  showTopOnly = false,
  streakLabel,
  classLabel,
}: {
  data: LeaderboardEntry[];
  showTopOnly?: boolean;
  streakLabel: string;
  classLabel: string;
}) {
  const topThree = data.filter((u) => u.rank <= 3);
  const restOfList = data.filter((u) => u.rank > 3);
  const currentUser = data.find((u) => u.isCurrentUser);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-4 mb-8">
        {/* 2nd Place */}
        {topThree[1] && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <Avatar className="h-16 w-16 mx-auto mb-2 border-2 border-slate-400">
              <AvatarImage src={topThree[1].avatar} />
              <AvatarFallback className="bg-slate-400/20 text-slate-300">
                {topThree[1].name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-white text-sm truncate max-w-[100px]">{topThree[1].name}</p>
            <p className="text-xs text-slate-400">{formatNumber(topThree[1].xp)} XP</p>
            <div className="w-20 h-16 bg-gradient-to-t from-slate-500 to-slate-400 rounded-t-lg mt-2 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
          </motion.div>
        )}

        {/* 1st Place */}
        {topThree[0] && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="relative inline-block">
              <Crown className="w-8 h-8 text-amber-400 absolute -top-4 left-1/2 -translate-x-1/2" />
              <Avatar className="h-20 w-20 mx-auto mb-2 border-2 border-amber-400 shadow-lg shadow-amber-500/30">
                <AvatarImage src={topThree[0].avatar} />
                <AvatarFallback className="bg-amber-400/20 text-amber-300 text-xl">
                  {topThree[0].name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
            <p className="font-semibold text-white truncate max-w-[120px]">{topThree[0].name}</p>
            <p className="text-sm text-amber-400 font-bold">{formatNumber(topThree[0].xp)} XP</p>
            <div className="w-24 h-24 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg mt-2 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <span className="text-3xl font-bold text-white">1</span>
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <Avatar className="h-14 w-14 mx-auto mb-2 border-2 border-amber-700">
              <AvatarImage src={topThree[2].avatar} />
              <AvatarFallback className="bg-amber-700/20 text-amber-600">
                {topThree[2].name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-white text-sm truncate max-w-[100px]">{topThree[2].name}</p>
            <p className="text-xs text-slate-400">{formatNumber(topThree[2].xp)} XP</p>
            <div className="w-20 h-12 bg-gradient-to-t from-amber-800 to-amber-700 rounded-t-lg mt-2 flex items-center justify-center">
              <span className="text-xl font-bold text-white">3</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Rest of the list */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-0">
          {restOfList.map((user, index) => (
            <motion.div
              key={user.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className={`flex items-center gap-4 p-4 border-b border-white/5 last:border-0 ${
                user.isCurrentUser ? 'bg-[#3B82F6]/10' : ''
              }`}
            >
              {getRankBadge(user.rank)}

              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6]">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-semibold truncate ${
                      user.isCurrentUser ? 'text-[#3B82F6]' : 'text-white'
                    }`}
                  >
                    {user.name}
                  </p>
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                    Lv.{user.level}
                  </Badge>
                </div>
                <div
                  className={`inline-block px-2 py-0.5 rounded text-xs mt-1 bg-gradient-to-r ${
                    careerAvatarColors[user.careerAvatar] || 'from-slate-500 to-slate-600'
                  } text-white`}
                >
                  {user.careerAvatar}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="text-center hidden md:block">
                  <p className="text-orange-400 font-semibold">{user.streak}</p>
                  <p className="text-xs text-slate-500">{streakLabel}</p>
                </div>
                <div className="text-center hidden md:block">
                  <p className="text-emerald-400 font-semibold">{user.classes}</p>
                  <p className="text-xs text-slate-500">{classLabel}</p>
                </div>
                <div className="text-right min-w-[80px]">
                  <p className="text-amber-400 font-bold">{formatNumber(user.xp)}</p>
                  <p className="text-xs text-slate-500">XP</p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Show current user if not in visible list */}
          {showTopOnly && currentUser && currentUser.rank > 10 && (
            <>
              <div className="py-2 text-center text-slate-500 text-sm border-y border-white/5">
                • • •
              </div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 p-4 bg-[#3B82F6]/10"
              >
                {getRankBadge(currentUser.rank)}

                <Avatar className="h-12 w-12">
                  <AvatarImage src={currentUser.avatar} />
                  <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6]">B</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#3B82F6]">{currentUser.name}</p>
                    <Badge variant="outline" className="text-xs border-[#3B82F6]/30 text-[#3B82F6]">
                      Lv.{currentUser.level}
                    </Badge>
                  </div>
                  <div
                    className={`inline-block px-2 py-0.5 rounded text-xs mt-1 bg-gradient-to-r ${
                      careerAvatarColors[currentUser.careerAvatar] || 'from-slate-500 to-slate-600'
                    } text-white`}
                  >
                    {currentUser.careerAvatar}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-amber-400 font-bold">{formatNumber(currentUser.xp)}</p>
                  <p className="text-xs text-slate-500">XP</p>
                </div>
              </motion.div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
