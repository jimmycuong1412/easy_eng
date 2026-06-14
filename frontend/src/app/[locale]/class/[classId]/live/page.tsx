'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';

// CometChat SDKs are browser-only — SSR of these components 500s the page
// shell before the client recovers, so render them client-side only.
const ClassRoom = dynamicImport(() => import('@/components/video/ClassRoom'), { ssr: false });
const WaitingRoom = dynamicImport(() => import('@/components/video/WaitingRoom'), { ssr: false });
import { MicIcon, CamIcon, DocIcon, BookIcon, FlagIcon, SparkIcon, UsersIcon, GearIcon, PlusIcon, DownloadIcon } from '@/components/editorial/Icons';

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
  start_time: string;
  max_students: number;
  duration_minutes: number;
  price: number;
}

export default function LiveClassPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const classId = params.classId as string;
  const locale = (params.locale as string) ?? 'en';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ClassSession | null>(null);
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [userRole, setUserRole] = useState<'teacher' | 'student'>('student');
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(true);
  const [waitingForTeacher, setWaitingForTeacher] = useState(false);

  useEffect(() => {
    loadClassData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  // Student arrived before the teacher created the session — poll until it appears
  useEffect(() => {
    if (!waitingForTeacher || session) return;
    const interval = setInterval(async () => {
      const { data } = await (supabase as any)
        .from('class_sessions').select('*').eq('class_id', classId).maybeSingle();
      if (data) {
        setSession(data);
        setWaitingForTeacher(false);
      }
    }, 8000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingForTeacher, session, classId]);

  const loadClassData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('You must be logged in to access this class');

      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles').select('role').eq('id', user.id).single();
      if (profileError || !profile) throw profileError ?? new Error('Profile not found');
      setUserRole((profile as any).role as 'teacher' | 'student');

      const { data: classData, error: classError } = await (supabase as any)
        .from('classes').select('*').eq('id', classId).single();
      if (classError) throw classError;
      setClassDetails(classData);

      if ((profile as any).role === 'student') {
        const { data: booking, error: bookingError } = await (supabase as any)
          .from('bookings').select('*').eq('user_id', user.id).eq('class_id', classId)
          .in('status', ['confirmed', 'completed']).single();
        if (bookingError || !booking) throw new Error('You must have a confirmed booking to join this class');
      }

      let { data: existingSession, error: sessionError } = await (supabase as any)
        .from('class_sessions').select('*').eq('class_id', classId).single();
      if (sessionError && sessionError.code !== 'PGRST116') throw sessionError;

      if (!existingSession && (profile as any).role === 'teacher' && classData.teacher_id === user.id) {
        const groupId = `class-${classId}-${Date.now()}`;
        const { data: newSession, error: createError } = await (supabase as any)
          .from('class_sessions')
          .insert({ class_id: classId, teacher_id: user.id, cometchat_group_id: groupId, status: 'scheduled', scheduled_start_time: classData.start_time, max_participants: classData.max_students })
          .select().single();
        if (createError) throw createError;
        existingSession = newSession;
      }

      if (!existingSession) {
        if ((profile as any).role === 'student') {
          // Teacher hasn't opened the room yet — wait and poll instead of erroring
          setWaitingForTeacher(true);
          setLoading(false);
          return;
        }
        throw new Error('Class session not found');
      }
      setSession(existingSession);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load class data');
      setLoading(false);
    }
  };

  const handleJoinReady = async () => {
    if (!session) return;
    try {
      if (userRole === 'teacher') {
        await (supabase as any).from('class_sessions')
          .update({ status: 'live', actual_start_time: new Date().toISOString() })
          .eq('id', session.id);
        setSession({ ...session, status: 'live', actual_start_time: new Date().toISOString() });
      }
      const joinUserId = (await supabase.auth.getUser()).data.user?.id;
      await (supabase as any).from('session_participants').upsert(
        { session_id: session.id, user_id: joinUserId, role: userRole, joined_at: new Date().toISOString() },
        { onConflict: 'session_id,user_id' }
      );
      // Referral payout: when a student attends a class, settle any pending
      // referral (idempotent server-side — only fires on their first class).
      if (userRole === 'student' && joinUserId) {
        (supabase as any).rpc('complete_referral_if_pending', { p_referred_id: joinUserId })
          .then(() => {}, (e: unknown) => console.error('referral settle failed:', e));
        (supabase as any).rpc('record_daily_activity', { p_user_id: joinUserId })
          .then(() => {}, () => {}); // also count class attendance toward streak
      }
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
      await (supabase as any).from('session_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('session_id', session.id).eq('user_id', userId);
      if (userRole === 'teacher') {
        await (supabase as any).from('class_sessions')
          .update({ status: 'ended', actual_end_time: new Date().toISOString() }).eq('id', session.id);
      }
    } catch (err) {
      console.error('Failed to leave class:', err);
    } finally {
      router.push(`/${locale}/${userRole === 'teacher' ? 'teacher/dashboard' : 'student/dashboard'}`);
    }
  };

  const handleError = (err: string | Error) => {
    setError(typeof err === 'string' ? err : err.message);
  };

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--et-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 999,
            border: '3px solid rgba(255,255,255,0.15)',
            borderTopColor: 'var(--ed-coral)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto',
          }} />
          <p style={{ marginTop: 20, fontFamily: 'var(--ed-mono)', fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: '#A3ADD0' }}>
            Loading class…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  /* ---- Waiting for teacher to open the room ---- */
  if (waitingForTeacher && !session) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--et-bg)' }}>
        <div style={{ maxWidth: 440, textAlign: 'center', padding: 40 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 999,
            border: '3px solid rgba(255,255,255,0.15)',
            borderTopColor: 'var(--ed-coral)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto',
          }} />
          <h2 className="ed-serif" style={{ fontSize: 28, color: '#F4EFE2', marginTop: 24 }}>
            Đang chờ giáo viên bắt đầu lớp học…
          </h2>
          <p style={{ fontFamily: 'var(--ed-sans)', fontSize: 14, color: '#A3ADD0', marginTop: 8, lineHeight: 1.6 }}>
            {classDetails?.title ?? 'Lớp học'}
            {classDetails?.start_time && (
              <> · {new Date(classDetails.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</>
            )}
            <br />
            Trang sẽ tự động cập nhật khi giáo viên vào lớp.
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  /* ---- Error ---- */
  if (error) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--et-bg)' }}>
        <div style={{ maxWidth: 420, textAlign: 'center', padding: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: 'var(--ed-coral-2)',
            display: 'grid', placeItems: 'center', margin: '0 auto',
          }}>
            <FlagIcon style={{ width: 28, height: 28, stroke: 'var(--ed-coral-ink)' }} />
          </div>
          <h2 className="ed-serif" style={{ fontSize: 28, color: '#F4EFE2', marginTop: 20 }}>Unable to join class</h2>
          <p style={{ fontFamily: 'var(--ed-sans)', fontSize: 14, color: '#A3ADD0', marginTop: 8, lineHeight: 1.5 }}>{error}</p>
          <button
            onClick={() => router.push(`/${locale}/${userRole === 'teacher' ? 'teacher/dashboard' : 'student/dashboard'}`)}
            className="ed-btn ed-btn-coral"
            style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!session || !classDetails) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--et-bg)' }}>
        <p style={{ fontFamily: 'var(--ed-mono)', color: '#A3ADD0', fontSize: 13 }}>Session not found</p>
      </div>
    );
  }

  /* ---- Waiting room ---- */
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

  /* ---- Live classroom ---- */
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

  /* ---- Class ended ---- */
  return (
    <div
      style={{
        display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
        background: 'var(--et-bg)',
      }}
    >
      <div style={{ maxWidth: 440, textAlign: 'center', padding: 40 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'rgba(255,255,255,0.08)',
          display: 'grid', placeItems: 'center', margin: '0 auto',
        }}>
          <BookIcon style={{ width: 28, height: 28, stroke: '#F4EFE2' }} />
        </div>
        <h2 className="ed-serif" style={{ fontSize: 32, color: '#F4EFE2', marginTop: 20 }}>Class has ended.</h2>
        <p style={{ fontFamily: 'var(--ed-sans)', fontSize: 15, color: '#A3ADD0', marginTop: 8 }}>
          Thank you for attending. Your notes have been saved.
        </p>
        <button
          onClick={() => router.push(`/${locale}/${userRole === 'teacher' ? 'teacher/dashboard' : 'student/dashboard'}`)}
          className="ed-btn ed-btn-primary"
          style={{ marginTop: 28, display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
