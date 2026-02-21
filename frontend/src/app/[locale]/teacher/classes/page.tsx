'use client';

/**
 * Teacher Classes Page
 *
 * List of all classes created by the teacher with status, enrollment, and actions.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Clock, Users, Plus, Loader2, BookOpen } from 'lucide-react';

interface TeacherClass {
  id: string;
  title: string;
  start_time: string;
  duration_minutes: number;
  max_students: number;
  current_enrollments: number;
  price: number;
  level: string;
  status: string;
  tags: string[] | null;
}

export default function TeacherClassesPage() {
  const supabase = createClient();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('classes')
        .select('id, title, start_time, duration_minutes, max_students, current_enrollments, price, level, status, tags')
        .eq('teacher_id', user.id)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      published: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Classes</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your scheduled classes</p>
        </div>
        <Link
          href="/teacher/classes/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create New Class
        </Link>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-6 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {!loading && !error && classes.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 text-6xl">📚</div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">No classes yet</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400">Create your first class to start teaching</p>
          <Link
            href="/teacher/classes/new"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create Your First Class
          </Link>
        </div>
      )}

      {!loading && classes.length > 0 && (
        <div className="space-y-4">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
              <div className="rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-md transition-all dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{cls.title}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadge(cls.status)}`}>
                        {cls.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(cls.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(cls.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        {' '}({cls.duration_minutes} min)
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {cls.current_enrollments}/{cls.max_students} students
                      </span>
                      {cls.tags?.[0] && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {cls.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {cls.price.toLocaleString()}đ
                    </p>
                    <p className="text-xs text-gray-500 capitalize mt-1">{cls.level}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
