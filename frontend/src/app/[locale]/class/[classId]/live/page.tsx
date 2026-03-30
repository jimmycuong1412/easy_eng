'use client';

export const dynamic = 'force-dynamic';

/**
 * Live Class Page
 *
 * Main page for live video class sessions
 * Task: T124 Create live class page
 */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ClassRoom from '@/components/video/ClassRoom';
import WaitingRoom from '@/components/video/WaitingRoom';
import { Loader2, AlertCircle } from 'lucide-react';

interface ClassSession {
  id: string;
  class_id: string;
  cometchat_group_id: string;
  status: 'scheduled' | 'waiting' | 'live' | 'ended' | 'cancelled' | 'no_show';
  scheduled_start_time: string;
  actual_start_time: string | null;
  teacher_id: string;
}

interface ClassDetails {
  id: string;
  title: string;
  description: string;
  teacher_id: string;
  scheduled_at: string;
  duration_minutes: number;
  price: number;
}

export default function LiveClassPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const classId = params.classId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ClassSession | null>(null);
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [userRole, setUserRole] = useState<'teacher' | 'student'>('student');
  const [hasBooking, setHasBooking] = useState(false);
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(true);

  // ============================================================================
  // Data Loading
  // ============================================================================

  useEffect(() => {
    loadClassData();
  }, [classId]);

  const loadClassData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('You must be logged in to access this class');
      }

      // Get user profile and role
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) throw profileError ?? new Error('Profile not found');
      setUserRole((profile as any).role as 'teacher' | 'student');

      // Get class details
      const { data: classData, error: classError } = await (supabase as any)
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (classError) throw classError;
      setClassDetails(classData);

      // Check if student has a valid booking
      if ((profile as any).role === 'student') {
        const { data: booking, error: bookingError } = await (supabase as any)
          .from('bookings')
          .select('*')
          .eq('student_id', user.id)
          .eq('class_id', classId)
          .in('status', ['confirmed', 'completed'])
          .single();

        if (bookingError || !booking) {
          throw new Error('You must have a confirmed booking to join this class');
        }
        setHasBooking(true);
      }

      // Get or create session
      let { data: existingSession, error: sessionError } = await (supabase as any)
        .from('class_sessions')
        .select('*')
        .eq('class_id', classId)
        .single();

      if (sessionError && sessionError.code !== 'PGRST116') {
        throw sessionError;
      }

      // If no session exists and user is teacher, create one
      if (!existingSession && (profile as any).role === 'teacher' && classData.teacher_id === user.id) {
        const groupId = `class-${classId}-${Date.now()}`;

        const { data: newSession, error: createError } = await (supabase as any)
          .from('class_sessions')
          .insert({
            class_id: classId,
            teacher_id: user.id,
            cometchat_group_id: groupId,
            status: 'scheduled',
            scheduled_start_time: classData.scheduled_at,
            max_participants: classData.capacity,
          })
          .select()
          .single();

        if (createError) throw createError;
        existingSession = newSession;
      }

      if (!existingSession) {
        throw new Error('Class session not found');
      }

      setSession(existingSession);
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load class data';
      setError(errorMessage);
      setLoading(false);
    }
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleJoinReady = async () => {
    if (!session) return;

    try {
      // Update session status to live if teacher is starting
      if (userRole === 'teacher') {
        await (supabase as any)
          .from('class_sessions')
          .update({
            status: 'live',
            actual_start_time: new Date().toISOString(),
          })
          .eq('id', session.id);

        setSession({ ...session, status: 'live', actual_start_time: new Date().toISOString() });
      }

      // Record participant joining
      await (supabase as any).from('session_participants').upsert(
        {
          session_id: session.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          role: userRole,
          joined_at: new Date().toISOString(),
        },
        {
          onConflict: 'session_id,user_id',
        }
      );

      setIsInWaitingRoom(false);
    } catch (err) {
      console.error('Failed to join class:', err);
      setError('Failed to join class. Please try again.');
    }
  };

  const handleLeave = async () => {
    if (!session) return;

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Update participant left time
      await (supabase as any)
        .from('session_participants')
        .update({
          left_at: new Date().toISOString(),
        })
        .eq('session_id', session.id)
        .eq('user_id', userId);

      // If teacher is leaving, end the session
      if (userRole === 'teacher') {
        await (supabase as any)
          .from('class_sessions')
          .update({
            status: 'ended',
            end_time: new Date().toISOString(),
          })
          .eq('id', session.id);
      }

      // Redirect to appropriate page
      if (userRole === 'teacher') {
        router.push('/teacher/classes');
      } else {
        router.push('/student/classes');
      }
    } catch (err) {
      console.error('Failed to leave class:', err);
      // Force redirect anyway
      router.push(userRole === 'teacher' ? '/teacher/classes' : '/student/classes');
    }
  };

  const handleError = (error: string | Error) => {
    console.error('ClassRoom error:', error);
    setError(typeof error === 'string' ? error : error.message);
  };

  // ============================================================================
  // Render States
  // ============================================================================

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
          <p className="mt-4 text-lg text-gray-300">Loading class...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
          <h2 className="mt-4 text-xl font-semibold text-white">Unable to Join Class</h2>
          <p className="mt-2 text-gray-400">{error}</p>
          <button
            onClick={() => router.push(userRole === 'teacher' ? '/teacher/classes' : '/student/classes')}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Back to Classes
          </button>
        </div>
      </div>
    );
  }

  if (!session || !classDetails) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-center text-gray-400">
          <p>Session not found</p>
        </div>
      </div>
    );
  }

  // Show waiting room before class starts
  if (isInWaitingRoom || session.status === 'scheduled' || session.status === 'waiting') {
    return (
      <WaitingRoom
        sessionId={session.id}
        classId={classId}
        scheduledStartTime={new Date(session.scheduled_start_time)}
        onJoinReady={handleJoinReady}
        userRole={userRole}
      />
    );
  }

  // Show classroom when live
  if (session.status === 'live') {
    return (
      <ClassRoom
        sessionId={session.id}
        classId={classId}
        groupId={session.cometchat_group_id}
        userRole={userRole}
        onLeave={handleLeave}
        onError={handleError}
      />
    );
  }

  // Class has ended
  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="max-w-md text-center">
        <h2 className="text-2xl font-semibold text-white">Class Has Ended</h2>
        <p className="mt-2 text-gray-400">Thank you for attending!</p>
        <button
          onClick={() => router.push(userRole === 'teacher' ? '/teacher/classes' : '/student/classes')}
          className="mt-6 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          Back to Classes
        </button>
      </div>
    </div>
  );
}
