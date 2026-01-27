'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  MessageSquare,
  Users,
  Settings,
  Share2,
  Maximize2,
  Monitor,
  Clock,
  Star,
  AlertCircle,
  Send,
  X,
  MoreVertical,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
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

// Mock class data
const mockClassData = {
  id: 'class-1',
  topic: 'Business English: Meeting Skills',
  teacher: {
    name: 'Nguyễn Minh Anh',
    avatar: '/avatars/teacher1.png',
    rating: 4.9,
    totalClasses: 1250,
  },
  student: {
    name: 'Học viên',
    avatar: '/avatars/student.png',
  },
  duration: 25,
  startTime: '09:00',
  scheduledDate: '2026-01-23',
  status: 'in_progress',
  xpReward: 100,
  cookiesReward: 5,
};

// Mock chat messages
const mockMessages = [
  { id: '1', sender: 'teacher', name: 'Nguyễn Minh Anh', message: 'Chào bạn! Hôm nay chúng ta sẽ học về Meeting Skills nhé.', time: '09:01' },
  { id: '2', sender: 'student', name: 'Học viên', message: 'Vâng ạ, em sẵn sàng rồi ạ!', time: '09:01' },
  { id: '3', sender: 'teacher', name: 'Nguyễn Minh Anh', message: 'Tốt lắm! Trước tiên, em có thể cho cô biết em đã từng tham gia cuộc họp tiếng Anh chưa?', time: '09:02' },
];

export default function LiveClassPage({ params }: { params: { classId: string } }) {
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = React.useState(true);
  const [showEndDialog, setShowEndDialog] = React.useState(false);
  const [newMessage, setNewMessage] = React.useState('');
  const [timeRemaining, setTimeRemaining] = React.useState(25 * 60); // 25 minutes in seconds
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [useCometChatIntegration, setUseCometChatIntegration] = React.useState(true);

  // CometChat integration
  const { isInitialized, isLoggedIn, currentUser, error: cometChatError } = useCometChat();
  const { messages, sendMessage, isSending } = useCometChatMessages(mockClassData.teacher.name);
  const { setActiveCall } = useVideoCallStore();

  // Fallback to mock messages if CometChat is not available
  const [mockMessagesList, setMockMessagesList] = React.useState(mockMessages);
  const displayMessages = useCometChatIntegration && isLoggedIn ? messages : mockMessagesList;

  // Timer
  React.useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    if (useCometChatIntegration && isLoggedIn) {
      // Use CometChat real-time messaging
      try {
        await sendMessage(newMessage);
        setNewMessage('');
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    } else {
      // Fallback to mock messages
      const message = {
        id: String(mockMessagesList.length + 1),
        sender: 'student',
        name: mockClassData.student.name,
        message: newMessage,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMockMessagesList([...mockMessagesList, message]);
      setNewMessage('');
    }
  };

  const handleEndClass = () => {
    router.push(`/class/${params.classId}/feedback`);
  };

  return (
    <div className="h-screen bg-[#0A1628] flex flex-col">
      {/* Header */}
      <header className="bg-[#1E3A5F]/80 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge className="bg-red-500 text-white border-0 animate-pulse">
              ● LIVE
            </Badge>
            <div>
              <h1 className="font-semibold text-white">{mockClassData.topic}</h1>
              <p className="text-sm text-slate-400">
                với {mockClassData.teacher.name}
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
              <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
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
              onClick={() => setIsFullscreen(!isFullscreen)}
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
              <p>⚠️ Real-time features unavailable. Using fallback mode.</p>
            </div>
          )}

          {/* CometChat Video Call Component */}
          {useCometChatIntegration && isInitialized && currentUser ? (
            <CallErrorBoundary>
              <div className="flex-1 rounded-2xl overflow-hidden">
                <CometChatVideoCall
                  remoteUserId={mockClassData.teacher.name}
                  remoteUserName={mockClassData.teacher.name}
                  remoteUserAvatar={mockClassData.teacher.avatar}
                  localUserName={mockClassData.student.name}
                  localUserAvatar={mockClassData.student.avatar}
                  onCallEnded={() => setShowEndDialog(true)}
                />
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
                      <AvatarImage src={mockClassData.teacher.avatar} />
                      <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6] text-4xl">
                        {mockClassData.teacher.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-white font-semibold text-lg">{mockClassData.teacher.name}</p>
                    <div className="flex items-center justify-center gap-1 text-amber-400 mt-1">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span className="text-sm">{mockClassData.teacher.rating}</span>
                    </div>
                    {useCometChatIntegration && !isInitialized && (
                      <p className="text-slate-400 text-sm mt-2">Initializing video...</p>
                    )}
                  </div>
                </div>

                {/* Teacher name overlay */}
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
                  <p className="text-white text-sm font-medium">{mockClassData.teacher.name}</p>
                </div>
              </div>

              {/* Student Video (Picture-in-Picture) */}
              <div className="absolute bottom-24 right-8 w-48 h-36 bg-slate-900 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={mockClassData.student.avatar} />
                    <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xl">
                      {mockClassData.student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded px-2 py-0.5">
                  <p className="text-white text-xs">Bạn</p>
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
              <h3 className="font-semibold text-white">Tin nhắn</h3>
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
                    // Handle both CometChat and mock message formats
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
                  placeholder="Nhập tin nhắn..."
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
            <AlertDialogTitle className="text-white">Kết thúc lớp học?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Bạn có chắc muốn kết thúc lớp học không? Sau khi kết thúc, bạn sẽ được chuyển đến trang đánh giá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-white/5 rounded-lg p-4 my-4">
            <p className="text-sm text-slate-300">Phần thưởng nhận được:</p>
            <div className="flex items-center gap-4 mt-2">
              <Badge className="bg-amber-500/20 text-amber-400 border-0">
                +{mockClassData.xpReward} XP
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                +{mockClassData.cookiesReward} 🍪
              </Badge>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
              Tiếp tục học
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
              onClick={handleEndClass}
            >
              Kết thúc
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
