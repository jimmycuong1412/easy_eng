'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, User, ArrowRight, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { format } from 'date-fns';
import { getSupabaseClient } from '@/lib/supabase/client';

interface UpcomingClass {
  id: string;
  title: string;
  teacher: string;
  scheduledAt: Date;
  duration: number; // in minutes
  topic: string;
}

/**
 * Upcoming Classes Widget
 *
 * Displays the student's upcoming booked classes with:
 * - Next 3 upcoming classes
 * - Class time and teacher information
 * - Quick join/view details actions
 * - Empty state when no classes booked
 */
export function UpcomingClassesWidget() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<UpcomingClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUpcomingClasses() {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        const supabase = getSupabaseClient();

        const { data, error } = await (supabase as any)
          .from('bookings')
          .select(`
            id,
            class:classes (
              id,
              title,
              description,
              start_time,
              duration_minutes,
              teacher:profiles!teacher_id (
                full_name
              )
            )
          `)
          .eq('user_id', user.id)
          .in('status', ['confirmed', 'pending'])
          .gte('classes.start_time', new Date().toISOString())
          .order('classes(start_time)', { ascending: true })
          .limit(3);

        if (error) throw error;

        const mapped: UpcomingClass[] = (data || [])
          .filter((b: any) => b.class)
          .map((b: any) => ({
            id: b.class.id,
            title: b.class.title,
            teacher: b.class.teacher?.full_name || 'Teacher',
            scheduledAt: new Date(b.class.start_time),
            duration: b.class.duration_minutes,
            topic: b.class.description || '',
          }));

        setClasses(mapped);
      } catch (error) {
        console.error('Error fetching upcoming classes:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUpcomingClasses();
  }, [user?.id]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 rounded-lg bg-gray-800/50 animate-pulse"
              >
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (classes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No upcoming classes booked</p>
            <Link href="/student/classes">
              <Button variant="outline" size="sm">
                Browse Classes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Upcoming Classes</CardTitle>
        <Link href="/student/bookings">
          <Button variant="ghost" size="sm" className="text-xs">
            View All
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {classes.slice(0, 3).map((classItem) => {
            const isToday =
              format(classItem.scheduledAt, 'yyyy-MM-dd') ===
              format(new Date(), 'yyyy-MM-dd');
            const isSoon =
              classItem.scheduledAt.getTime() - Date.now() < 2 * 60 * 60 * 1000; // Less than 2 hours

            return (
              <div
                key={classItem.id}
                className="p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors border border-gray-700/50 hover:border-gray-600/50"
              >
                {/* Status Badge */}
                {isSoon && (
                  <div className="mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse" />
                      Starting Soon
                    </span>
                  </div>
                )}

                {/* Class Title */}
                <h4 className="font-semibold text-white mb-2">
                  {classItem.title}
                </h4>

                {/* Class Details */}
                <div className="space-y-1.5 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {isToday ? 'Today' : format(classItem.scheduledAt, 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(classItem.scheduledAt, 'h:mm a')} ({classItem.duration} min)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{classItem.teacher}</span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <Link href={`/student/classes/${classItem.id}`}>
                    <Button
                      variant={isSoon ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                    >
                      {isSoon ? 'Join Class' : 'View Details'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
