/**
 * Class Session Utilities
 *
 * Utilities for starting and joining class sessions
 * Tasks: T125, T126 - Start and join class functionality
 */

import { createClient } from '@/lib/supabase/client';
import { CometChatService } from '@/lib/cometchat';

// ============================================================================
// Types
// ============================================================================

export interface ClassSession {
  id: string;
  class_id: string;
  teacher_id: string;
  cometchat_group_id: string;
  cometchat_session_id: string | null;
  status: 'scheduled' | 'waiting' | 'live' | 'ended' | 'cancelled' | 'no_show';
  scheduled_start_time: string;
  actual_start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  max_participants: number;
  current_participants: number;
  recording_enabled: boolean;
  metadata: Record<string, any>;
}

export interface StartClassOptions {
  classId: string;
  teacherId: string;
  scheduledStartTime: string;
  maxParticipants: number;
  className?: string;
  classDescription?: string;
}

export interface JoinClassOptions {
  sessionId: string;
  classId: string;
  studentId: string;
  groupId: string;
}

export interface SessionResult {
  success: boolean;
  session?: ClassSession;
  error?: string;
}

// ============================================================================
// Teacher Functions
// ============================================================================

/**
 * Start a class session (Teacher only)
 * Creates or updates the session and CometChat group
 */
export async function startClassSession(
  options: StartClassOptions
): Promise<SessionResult> {
  const supabase = createClient();

  try {
    // Validate teacher permissions
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== options.teacherId) {
      return {
        success: false,
        error: 'Unauthorized: Only the class teacher can start the session',
      };
    }

    // Check if session already exists
    const { data: existingSession } = await (supabase as any)
      .from('class_sessions')
      .select('*')
      .eq('class_id', options.classId)
      .single();

    const groupId = existingSession?.cometchat_group_id || `class-${options.classId}-${Date.now()}`;

    // Create CometChat group if it doesn't exist
    await CometChatService.createGroup(
      groupId,
      options.className || 'Live Class',
      options.classDescription,
      undefined,
      {
        class_id: options.classId,
        teacher_id: options.teacherId,
      }
    );

    let session: ClassSession;

    if (existingSession) {
      // Update existing session
      const { data: updatedSession, error: updateError } = await (supabase as any)
        .from('class_sessions')
        .update({
          status: 'live',
          actual_start_time: new Date().toISOString(),
        })
        .eq('id', existingSession.id)
        .select()
        .single();

      if (updateError) throw updateError;
      session = updatedSession;
    } else {
      // Create new session
      const { data: newSession, error: createError } = await (supabase as any)
        .from('class_sessions')
        .insert({
          class_id: options.classId,
          teacher_id: options.teacherId,
          cometchat_group_id: groupId,
          status: 'live',
          scheduled_start_time: options.scheduledStartTime,
          actual_start_time: new Date().toISOString(),
          max_participants: options.maxParticipants,
          metadata: {
            class_name: options.className,
            class_description: options.classDescription,
          },
        })
        .select()
        .single();

      if (createError) throw createError;
      session = newSession;
    }

    // Log session start event
    await (supabase as any).from('session_events').insert({
      session_id: session.id,
      user_id: options.teacherId,
      event_type: 'session_started',
      event_data: {
        started_at: new Date().toISOString(),
        group_id: groupId,
      },
    });

    // Add teacher as participant
    await (supabase as any).from('session_participants').upsert(
      {
        session_id: session.id,
        user_id: options.teacherId,
        role: 'teacher',
        joined_at: new Date().toISOString(),
      },
      {
        onConflict: 'session_id,user_id',
      }
    );

    return {
      success: true,
      session,
    };
  } catch (error) {
    console.error('Failed to start class session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start class session',
    };
  }
}

/**
 * End a class session (Teacher only)
 */
export async function endClassSession(sessionId: string, teacherId: string): Promise<SessionResult> {
  const supabase = createClient();

  try {
    // Validate teacher permissions
    const { data: session } = await (supabase as any)
      .from('class_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session || session.teacher_id !== teacherId) {
      return {
        success: false,
        error: 'Unauthorized: Only the class teacher can end the session',
      };
    }

    // Calculate duration
    const actualStart = session.actual_start_time
      ? new Date(session.actual_start_time)
      : new Date(session.scheduled_start_time);
    const endTime = new Date();
    const durationMinutes = Math.floor((endTime.getTime() - actualStart.getTime()) / 60000);

    // Update session status
    const { data: updatedSession, error: updateError } = await (supabase as any)
      .from('class_sessions')
      .update({
        status: 'ended',
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update all participants' left_at time if not set
    await (supabase as any)
      .from('session_participants')
      .update({
        left_at: endTime.toISOString(),
      })
      .eq('session_id', sessionId)
      .is('left_at', null);

    // Log session end event
    await (supabase as any).from('session_events').insert({
      session_id: sessionId,
      user_id: teacherId,
      event_type: 'session_ended',
      event_data: {
        ended_at: endTime.toISOString(),
        duration_minutes: durationMinutes,
      },
    });

    // Trigger reward distribution (will be handled by edge function)
    // Note: This would typically call an edge function to process rewards
    // For now, we just mark that the session ended successfully

    return {
      success: true,
      session: updatedSession,
    };
  } catch (error) {
    console.error('Failed to end class session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to end class session',
    };
  }
}

// ============================================================================
// Student Functions
// ============================================================================

/**
 * Join a class session (Student only)
 * Validates booking and adds student to session
 */
export async function joinClassSession(options: JoinClassOptions): Promise<SessionResult> {
  const supabase = createClient();

  try {
    // Validate student has a confirmed booking
    const { data: booking, error: bookingError } = await (supabase as any)
      .from('bookings')
      .select('*')
      .eq('student_id', options.studentId)
      .eq('class_id', options.classId)
      .in('status', ['confirmed', 'completed'])
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: 'You must have a confirmed booking to join this class',
      };
    }

    // Get session details
    const { data: session, error: sessionError } = await (supabase as any)
      .from('class_sessions')
      .select('*')
      .eq('id', options.sessionId)
      .single();

    if (sessionError || !session) {
      return {
        success: false,
        error: 'Class session not found',
      };
    }

    // Check if session is live
    if (session.status !== 'live') {
      return {
        success: false,
        error: 'Class session is not live yet',
      };
    }

    // Check capacity
    if (session.current_participants >= session.max_participants) {
      return {
        success: false,
        error: 'Class is full',
      };
    }

    // Join CometChat group
    const joinedGroup = await CometChatService.joinGroup(options.groupId);

    if (!joinedGroup) {
      return {
        success: false,
        error: 'Failed to join video room',
      };
    }

    // Add student as participant
    const { error: participantError } = await (supabase as any)
      .from('session_participants')
      .upsert(
        {
          session_id: options.sessionId,
          user_id: options.studentId,
          booking_id: booking.id,
          role: 'student',
          joined_at: new Date().toISOString(),
        },
        {
          onConflict: 'session_id,user_id',
        }
      );

    if (participantError) throw participantError;

    // Increment participant count
    await (supabase as any).rpc('increment_session_participants', {
      session_id: options.sessionId,
    });

    // Log join event
    await (supabase as any).from('session_events').insert({
      session_id: options.sessionId,
      user_id: options.studentId,
      event_type: 'participant_joined',
      event_data: {
        joined_at: new Date().toISOString(),
      },
    });

    return {
      success: true,
      session: session as ClassSession,
    };
  } catch (error) {
    console.error('Failed to join class session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join class session',
    };
  }
}

/**
 * Leave a class session (Student)
 * Updates participant record with leave time
 */
export async function leaveClassSession(
  sessionId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Get participant record
    const { data: participant } = await (supabase as any)
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', studentId)
      .single();

    if (!participant) {
      return { success: false, error: 'Participant record not found' };
    }

    // Calculate duration
    const joinedAt = new Date(participant.joined_at);
    const leftAt = new Date();
    const durationSeconds = Math.floor((leftAt.getTime() - joinedAt.getTime()) / 1000);

    // Update participant record
    await (supabase as any)
      .from('session_participants')
      .update({
        left_at: leftAt.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('session_id', sessionId)
      .eq('user_id', studentId);

    // Decrement participant count
    await (supabase as any).rpc('decrement_session_participants', {
      session_id: sessionId,
    });

    // Log leave event
    await (supabase as any).from('session_events').insert({
      session_id: sessionId,
      user_id: studentId,
      event_type: 'participant_left',
      event_data: {
        left_at: leftAt.toISOString(),
        duration_seconds: durationSeconds,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to leave class session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to leave class session',
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get current session status
 */
export async function getSessionStatus(sessionId: string): Promise<ClassSession | null> {
  const supabase = createClient();

  try {
    const { data: session, error } = await (supabase as any)
      .from('class_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Failed to get session status:', error);
    return null;
  }
}

/**
 * Check if user can join session
 */
export async function canJoinSession(
  sessionId: string,
  userId: string,
  userRole: 'teacher' | 'student'
): Promise<{ canJoin: boolean; reason?: string }> {
  const supabase = createClient();

  try {
    const { data: session } = await (supabase as any)
      .from('class_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return { canJoin: false, reason: 'Session not found' };
    }

    // Teacher can always join their own session
    if (userRole === 'teacher' && session.teacher_id === userId) {
      return { canJoin: true };
    }

    // Check if session is live
    if (session.status !== 'live') {
      return { canJoin: false, reason: 'Session is not live' };
    }

    // Check capacity
    if (session.current_participants >= session.max_participants) {
      return { canJoin: false, reason: 'Session is full' };
    }

    // For students, check booking
    if (userRole === 'student') {
      const { data: booking } = await (supabase as any)
        .from('bookings')
        .select('*')
        .eq('student_id', userId)
        .eq('class_id', session.class_id)
        .in('status', ['confirmed', 'completed'])
        .single();

      if (!booking) {
        return { canJoin: false, reason: 'Valid booking required' };
      }
    }

    return { canJoin: true };
  } catch (error) {
    console.error('Failed to check join permission:', error);
    return { canJoin: false, reason: 'Failed to verify permissions' };
  }
}
