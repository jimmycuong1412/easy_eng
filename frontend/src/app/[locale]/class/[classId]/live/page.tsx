'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Video,
  Mic,
  Phone,
  MessageSquare,
  Maximize2,
  Monitor,
  Clock,
  Star,
  Send,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useCometChat } from '@/hooks/useCometChat';
import { useCometChatMessages } from '@/hooks/useCometChatMessages';
import { CometChatVideoCall } from '@/components/video/CometChatVideoCall';
import { CallErrorBoundary } from '@/components/video/CallErrorBoundary';
import { useVideoCallStore } from '@/stores/videoCallStore';
import { getSupabaseClient } from '@/lib/supabase/client';

interface ClassSessionData {
  id: string;
  class_id: string;
  teacher_id: string;
  cometchat_group_id: string;
  cometchat_session_id: string | null;
  status: string;
  scheduled_start_time: string;
  duration_minutes: number | null;
  max_participants: number;
  current_participants: number;
  recording_url: string | null;
  classes: {
    id: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    level: string;
    price: number;
    profiles: {
      full_name: string | null;
      avatar_url: string | null;
      average_rating?: number;
    } | null;
  } | null;
}

export default function LiveClassPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;

  const [classSession, setClassSession] = React.useState<ClassSessionData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<{ id: string; full_name: string; avatar_url: string | null } | null>(null);

  const [isChatOpen, setIsChatOpen] = React.useState(true);
  const [showEndDialog, setShowEndDialog] = React.useState(false);
  const [newMessage, setNewMessage] = React.useState('');
  const [timeRemaining, setTimeRemaining] = React.useState(0);
  const [isFullscreen, _setIsFullscreen] = React.useState(false);
  const [useCometChatIntegration, _setUseCometChatIntegration] = React.useState(true);

  // CometChat integration
  const { isInitialized, isLoggedIn, currentUser: cometChatUser, error: cometChatError, login: cometChatLogin } = useCometChat();
  const teacherName = classSession?.classes?.profiles?.full_name || '';
  const teacherId = classSession?.teacher_id || '';

  // Determine if the current user is the teacher or the student.
  // Teachers wait for the student's incoming call — they don't initiate.
  // Students initiate the call to the teacher.
  const isTeacher = !!(currentUser && teacherId && currentUser.id === teacherId);

  const { messages, sendMessage, isSending: _isSending } = useCometChatMessages(teacherId);
  const { setActiveCall: _setActiveCall } = useVideoCallStore();

  // Auto-login to CometChat once initialized and user data is available.
  // Also pre-register the teacher so calls can be directed to them.
  const [teacherPreRegistered, setTeacherPreRegistered] = React.useState(false);
  React.useEffect(() => {
    if (!isInitialized || !currentUser) return;

    if (!isLoggedIn) {
      // Login — pass teacherId if available so backend registers teacher at same time
      cometChatLogin(currentUser.id, undefined, teacherId || undefined)
        .then(() => {
          if (teacherId) setTeacherPreRegistered(true);
        })
        .catch((err) => {
          console.error('[LiveClass] CometChat login failed:', err);
        });
    } else if (isLoggedIn && teacherId && !teacherPreRegistered) {
      // Already logged in but teacher not yet pre-registered — register now
      fetch('/api/cometchat/auth-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: teacherId }),
      })
        .then(() => setTeacherPreRegistered(true))
        .catch((err) => console.error('[LiveClass] Teacher pre-registration failed:', err));
    }
  }, [isInitialized, isLoggedIn, currentUser, teacherId, teacherPreRegistered, cometChatLogin]);

  // Fallback mock messages
  const [fallbackMessages, setFallbackMessages] = React.useState<Array<{
    id: string;
    sender: string;
    name: string;
    message: string;
    time: string;
  }>>([]);
  const displayMessages = useCometChatIntegration && isLoggedIn ? messages : fallbackMessages;

  // Fetch class session and user data from Supabase
  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const supabase = getSupabaseClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', user.id)
            .single();
          if (profile) {
            setCurrentUser(profile);
          }
        }

        // Fetch the active class session for this class
        const { data: sessionData, error: sessionError } = await supabase
          .from('class_sessions')
          .select('*, classes(id, title, description, duration_minutes, level, price, profiles!classes_teacher_id_profiles_fkey(full_name, avatar_url))')
          .eq('class_id', classId)
          .in('status', ['live', 'waiting', 'scheduled'])
          .order('scheduled_start_time', { ascending: false })
          .limit(1)
          .single();

        if (sessionError) {
          // If no active session found, try to get class info directly
          const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('*, profiles!classes_teacher_id_profiles_fkey(full_name, avatar_url)')
            .eq('id', classId)
            .single();

          if (classError) throw classError;

          // Create a synthetic session object from class data
          setClassSession({
            id: '',
            class_id: classId,
            teacher_id: classData.teacher_id,
            cometchat_group_id: classId,
            cometchat_session_id: null,
            status: 'live',
            scheduled_start_time: classData.start_time,
            duration_minutes: classData.duration_minutes,
            max_participants: classData.max_students,
            current_participants: classData.current_enrollments,
            recording_url: null,
            classes: {
              id: classData.id,
              title: classData.title,
              description: classData.description,
              duration_minutes: classData.duration_minutes,
              level: classData.level,
              price: classData.price,
              profiles: classData.profiles,
            },
          });
        } else {
          setClassSession(sessionData as ClassSessionData);
        }
      } catch (err) {
        console.error('Failed to fetch class session:', err);
        setError(err instanceof Error ? err.message : 'Failed to load class session');
      } finally {
        setLoading(false);
      }
    }

    if (classId) {
      fetchData();
    }
  }, [classId]);

  // Set initial timer once session data is available
  React.useEffect(() => {
    if (classSession) {
      const duration = classSession.duration_minutes || classSession.classes?.duration_minutes || 25;
      setTimeRemaining(duration * 60);
    }
  }, [classSession]);

  // Timer countdown
  React.useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const formatTimeDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    if (useCometChatIntegration && isLoggedIn) {
      try {
        await sendMessage(newMessage);
        setNewMessage('');
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    } else {
      const message = {
        id: String(fallbackMessages.length + 1),
        sender: 'student',
        name: currentUser?.full_name || 'Student',
        message: newMessage,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setFallbackMessages([...fallbackMessages, message]);
      setNewMessage('');
    }
  };

  const handleEndClass = () => {
    router.push(`/class/${classId}/feedback`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Connecting to class...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !classSession) {
    return (
      <div className="h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Unable to join class</h2>
          <p className="text-slate-400 mb-4">{error || 'Class session not found'}</p>
          <Button
            onClick={() => router.back()}
            className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
          >
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const classTopic = classSession.classes?.title || 'Class';
  const teacherAvatarUrl = classSession.classes?.profiles?.avatar_url || '';
  const teacherRating = classSession.classes?.profiles?.average_rating || 0;
  const studentName = currentUser?.full_name || 'Student';
  const studentAvatar = currentUser?.avatar_url || '';
  const xpReward = 100;
  const gemsReward = 5;

  return (
    <div className="h-screen bg-[#0A1628] flex flex-col">
      {/* Header */}
      <header className="bg-[#1E3A5F]/80 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge className="bg-red-500 text-white border-0 animate-pulse">
              LIVE
            </Badge>
            <div>
              <h1 className="font-semibold text-white">{classTopic}</h1>
              <p className="text-sm text-slate-400">
                with {teacherName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                timeRemaining < 300 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold">{formatTimeDisplay(timeRemaining)}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
              onClick={() => _setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 p-4 flex flex-col gap-4">
          {/* Show error if CometChat failed to initialize */}
          {useCometChatIntegration && cometChatError && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-300 text-sm">
              <p>Real-time features unavailable. Using fallback mode.</p>
            </div>
          )}

          {/* CometChat Video Call Component */}
          {useCometChatIntegration && isInitialized && cometChatUser ? (
            <CallErrorBoundary>
              <div className="flex-1 rounded-2xl overflow-hidden">
                {isTeacher ? (
                  // Teacher waits for student to call — renders in receive/waiting mode
                  <CometChatVideoCall
                    remoteUserId=""
                    remoteUserName="Student"
                    remoteUserAvatar=""
                    localUserName={teacherName || studentName}
                    localUserAvatar={teacherAvatarUrl || studentAvatar}
                    isIncoming={true}
                    onCallEnded={() => setShowEndDialog(true)}
                  />
                ) : (
                  // Student initiates the call to the teacher
                  <CometChatVideoCall
                    remoteUserId={teacherId}
                    remoteUserName={teacherName}
                    remoteUserAvatar={teacherAvatarUrl}
                    localUserName={studentName}
                    localUserAvatar={studentAvatar}
                    isIncoming={false}
                    onCallEnded={() => setShowEndDialog(true)}
                  />
                )}
              </div>
            </CallErrorBoundary>
          ) : (
            <>
              {/* Fallback Video Display */}
              <div className="flex-1 relative bg-slate-800 rounded-2xl overflow-hidden">
                {/* Placeholder for video */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Avatar className="h-32 w-32 mx-auto mb-4 border-4 border-[#3B82F6]/30">
                      <AvatarImage src={teacherAvatarUrl} />
                      <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6] text-4xl">
                        {teacherName.charAt(0) || 'T'}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-white font-semibold text-lg">{teacherName}</p>
                    <div className="flex items-center justify-center gap-1 text-amber-400 mt-1">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span className="text-sm">{teacherRating > 0 ? teacherRating.toFixed(1) : 'New'}</span>
                    </div>
                    {useCometChatIntegration && !isInitialized && (
                      <p className="text-slate-400 text-sm mt-2">Initializing video...</p>
                    )}
                  </div>
                </div>

                {/* Teacher name overlay */}
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
                  <p className="text-white text-sm font-medium">{teacherName}</p>
                </div>
              </div>

              {/* Student Video (Picture-in-Picture) */}
              <div className="absolute bottom-24 right-8 w-48 h-36 bg-slate-900 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={studentAvatar} />
                    <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xl">
                      {studentName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded px-2 py-0.5">
                  <p className="text-white text-xs">You</p>
                </div>
              </div>

              {/* Fallback Controls - Basic Controls */}
              <div className="flex items-center justify-center gap-4 py-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-14 h-14 rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Mic className="w-6 h-6" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="w-14 h-14 rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Video className="w-6 h-6" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="w-14 h-14 rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Monitor className="w-6 h-6" />
                </Button>

                <Button
                  size="icon"
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-500/90 text-white"
                  onClick={() => setShowEndDialog(true)}
                >
                  <Phone className="w-6 h-6 rotate-[135deg]" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Chat Panel */}
        {isChatOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="w-80 bg-[#1E3A5F]/50 border-l border-white/10 flex flex-col"
          >
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white">Messages</h3>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-white"
                onClick={() => setIsChatOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {displayMessages && displayMessages.length > 0 ? (
                  displayMessages.map((msg: any) => {
                    // Handle both CometChat and fallback message formats
                    const isCometChatMsg = 'sender' in msg && typeof msg.sender === 'object';
                    const isOwn = isCometChatMsg ? msg.isOwn : msg.sender === 'student';
                    const senderName = isCometChatMsg ? msg.sender.name : msg.name;
                    const messageText = isCometChatMsg ? msg.text : msg.message;
                    const messageTime = isCometChatMsg
                      ? msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                      : msg.time;

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback
                            className={`text-xs ${
                              isOwn
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-[#3B82F6]/20 text-[#3B82F6]'
                            }`}
                          >
                            {senderName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`px-3 py-2 rounded-lg max-w-[200px] ${
                              isOwn
                                ? 'bg-[#3B82F6] text-white'
                                : 'bg-white/10 text-white'
                            }`}
                          >
                            <p className="text-sm">{messageText}</p>
                          </div>
                          <span className="text-xs text-slate-500 mt-1">{messageTime}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-slate-500 py-8">
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                />
                <Button
                  size="icon"
                  className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                  onClick={handleSendMessage}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* End Class Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent className="bg-[#1E3A5F] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">End class?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to end the class? You will be redirected to the feedback page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-white/5 rounded-lg p-4 my-4">
            <p className="text-sm text-slate-300">Rewards earned:</p>
            <div className="flex items-center gap-4 mt-2">
              <Badge className="bg-amber-500/20 text-amber-400 border-0">
                +{xpReward} XP
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                +{gemsReward} Gems
              </Badge>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
              Continue learning
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
              onClick={handleEndClass}
            >
              End class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
