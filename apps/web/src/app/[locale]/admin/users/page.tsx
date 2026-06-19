'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import {
  Search,
  Users,
  UserCheck,
  GraduationCap,
  ShieldCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
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

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
  is_active: boolean | null;
}

const PAGE_SIZE = 20;

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  teacher: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  student: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  parent: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <ShieldCheck className="w-3 h-3" />,
  teacher: <GraduationCap className="w-3 h-3" />,
  student: <UserCheck className="w-3 h-3" />,
  parent: <Users className="w-3 h-3" />,
};

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function UserManagementPage() {
  const t = useTranslations('adminUsers');
  const supabase = createClient();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const stats = {
    total,
    teachers: users.filter((u) => u.role === 'teacher').length,
    students: users.filter((u) => u.role === 'student').length,
    admins: users.filter((u) => u.role === 'admin').length,
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url, created_at, is_active', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (roleFilter !== 'all') query = query.eq('role', roleFilter);
      if (search.trim()) query = query.ilike('full_name', `%${search.trim()}%`);

      const { data, count, error } = await query;
      if (error) throw error;
      setUsers((data as UserProfile[]) ?? []);
      setTotal(count ?? 0);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, page, roleFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchUsers(); }, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchUsers, search]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [roleFilter, search]);

  const changeRole = async (userId: string, newRole: string) => {
    setSaving(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Error changing role:', err);
    } finally {
      setSaving(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{t('title')}</h1>
              <p className="text-slate-400">{t('subtitle')}</p>
            </div>
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={fetchUsers}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
          >
            {[
              { label: t('stats.total'), value: total, icon: <Users className="w-5 h-5 text-slate-400" /> },
              { label: t('stats.students'), value: stats.students, icon: <UserCheck className="w-5 h-5 text-emerald-400" /> },
              { label: t('stats.teachers'), value: stats.teachers, icon: <GraduationCap className="w-5 h-5 text-blue-400" /> },
              { label: t('stats.admins'), value: stats.admins, icon: <ShieldCheck className="w-5 h-5 text-purple-400" /> },
            ].map((stat) => (
              <Card key={stat.label} className="bg-white/5 border-white/10">
                <CardContent className="p-4 flex items-center gap-3">
                  {stat.icon}
                  <div>
                    <p className="text-xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col md:flex-row gap-3 mb-6"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-44 bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('roles.all')}</SelectItem>
                <SelectItem value="student">{t('roles.student')}</SelectItem>
                <SelectItem value="teacher">{t('roles.teacher')}</SelectItem>
                <SelectItem value="parent">{t('roles.parent')}</SelectItem>
                <SelectItem value="admin">{t('roles.admin')}</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/5 border-white/10 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-white font-medium">{t('noUsers')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b border-white/10 text-left">
                        <th className="p-4 text-slate-400 font-medium text-sm">{t('cols.user')}</th>
                        <th className="p-4 text-slate-400 font-medium text-sm">{t('cols.email')}</th>
                        <th className="p-4 text-slate-400 font-medium text-sm">{t('cols.role')}</th>
                        <th className="p-4 text-slate-400 font-medium text-sm">{t('cols.joined')}</th>
                        <th className="p-4 text-slate-400 font-medium text-sm">{t('cols.changeRole')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url ?? undefined} />
                                <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6] text-xs">
                                  {getInitials(user.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-white font-medium text-sm truncate max-w-[160px]">
                                {user.full_name ?? t('unnamed')}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-400 text-sm">{user.email ?? '—'}</td>
                          <td className="p-4">
                            <Badge className={`flex items-center gap-1 w-fit border text-xs ${ROLE_COLORS[user.role] ?? 'bg-white/10 text-slate-400'}`}>
                              {ROLE_ICONS[user.role]}
                              {user.role}
                            </Badge>
                          </td>
                          <td className="p-4 text-slate-400 text-sm">{formatDate(user.created_at)}</td>
                          <td className="p-4">
                            <Select
                              value={user.role}
                              onValueChange={(val) => changeRole(user.id, val)}
                              disabled={saving === user.id}
                            >
                              <SelectTrigger className="w-32 h-8 bg-white/5 border-white/10 text-white text-xs">
                                {saving === user.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <SelectValue />}
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a2236] border-white/10 text-white">
                                <SelectItem value="student" className="text-white focus:bg-white/10 focus:text-white">{t('roles.student')}</SelectItem>
                                <SelectItem value="teacher" className="text-white focus:bg-white/10 focus:text-white">{t('roles.teacher')}</SelectItem>
                                <SelectItem value="parent" className="text-white focus:bg-white/10 focus:text-white">{t('roles.parent')}</SelectItem>
                                <SelectItem value="admin" className="text-white focus:bg-white/10 focus:text-white">{t('roles.admin')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-400">
                {t('pagination', { from: page * PAGE_SIZE + 1, to: Math.min((page + 1) * PAGE_SIZE, total), total })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
