'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Speaker,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Wifi,
} from 'lucide-react';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getClassById } from '@easyeng/core';

interface DeviceStatus {
  camera: 'checking' | 'success' | 'error';
  microphone: 'checking' | 'success' | 'error';
  speaker: 'checking' | 'success' | 'error';
  network: 'checking' | 'success' | 'error';
}

interface DeviceErrorMessage {
  camera?: string;
  microphone?: string;
  speaker?: string;
  network?: string;
}

export default function PreClassCheckPage({ params }: { params: { classId: string } }) {
  const t = useTranslations('preCheck');
  const [classData, setClassData] = React.useState({
    id: params.classId,
    topic: '',
    teacher: { name: '', avatar: '' },
    scheduledAt: new Date().toISOString(),
    duration: 25,
  });

  React.useEffect(() => {
    getClassById(params.classId)
      .then((data: Record<string, unknown>) => {
        const teacher = data.profiles as Record<string, unknown> | undefined;
        setClassData({
          id: (data.id as string) || params.classId,
          topic: (data.title as string) || 'Class',
          teacher: {
            name: (teacher?.full_name as string) || 'Teacher',
            avatar: (teacher?.avatar_url as string) || '',
          },
          scheduledAt: (data.start_time as string) || new Date().toISOString(),
          duration: (data.duration_minutes as number) || 25,
        });
      })
      .catch(console.error);
  }, [params.classId]);
  const router = useRouter();
  const [deviceStatus, setDeviceStatus] = React.useState<DeviceStatus>({
    camera: 'checking',
    microphone: 'checking',
    speaker: 'checking',
    network: 'checking',
  });
  const [deviceErrors, setDeviceErrors] = React.useState<DeviceErrorMessage>({});
  const [isCameraOn, setIsCameraOn] = React.useState(true);
  const [isMicOn, setIsMicOn] = React.useState(true);
  const [allChecksComplete, setAllChecksComplete] = React.useState(false);
  const [networkSpeed, setNetworkSpeed] = React.useState<string>('');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const micStreamRef = React.useRef<MediaStream | null>(null);

  // Real device checks
  React.useEffect(() => {
    const checkDevices = async () => {
      const errors: DeviceErrorMessage = {};

      try {
        // Check camera
        try {
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          });

          if (videoRef.current) {
            videoRef.current.srcObject = cameraStream;
          }
          setDeviceStatus((prev) => ({ ...prev, camera: 'success' }));

          // Stop camera stream
          cameraStream.getTracks().forEach((track) => track.stop());
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Unknown error';
          errors.camera = error;
          setDeviceStatus((prev) => ({ ...prev, camera: 'error' }));
        }

        // Check microphone
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;

          // Set up audio context for microphone level monitoring
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          }

          const audioContext = audioContextRef.current;
          const source = audioContext.createMediaStreamSource(micStream);
          const analyser = audioContext.createAnalyser();
          analyserRef.current = analyser;
          source.connect(analyser);

          setDeviceStatus((prev) => ({ ...prev, microphone: 'success' }));
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Unknown error';
          errors.microphone = error;
          setDeviceStatus((prev) => ({ ...prev, microphone: 'error' }));
        }

        // Check speaker (play a tone)
        try {
          const audioContext = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();

          oscillator.connect(gain);
          gain.connect(audioContext.destination);

          oscillator.frequency.value = 440; // A4 note
          gain.gain.setValueAtTime(0.1, audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);

          setDeviceStatus((prev) => ({ ...prev, speaker: 'success' }));
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Unknown error';
          errors.speaker = error;
          setDeviceStatus((prev) => ({ ...prev, speaker: 'error' }));
        }

        // Check network speed
        try {
          const testStart = Date.now();
          const response = await fetch('/api/health', { method: 'HEAD' });

          if (response.ok) {
            const testEnd = Date.now();
            const latency = testEnd - testStart;

            // Classify speed
            if (latency < 100) {
              setNetworkSpeed('Excellent');
              setDeviceStatus((prev) => ({ ...prev, network: 'success' }));
            } else if (latency < 300) {
              setNetworkSpeed('Good');
              setDeviceStatus((prev) => ({ ...prev, network: 'success' }));
            } else {
              setNetworkSpeed('Fair');
              setDeviceStatus((prev) => ({ ...prev, network: 'success' }));
            }
          } else {
            throw new Error('Network unreachable');
          }
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Unknown error';
          errors.network = error;
          setDeviceStatus((prev) => ({ ...prev, network: 'error' }));
        }

        setDeviceErrors(errors);
        setAllChecksComplete(true);
      } catch (err) {
        console.error('Device check failed:', err);
        setAllChecksComplete(true);
      }
    };

    checkDevices();

    const videoEl = videoRef.current;
    return () => {
      // Cleanup: stop any active streams
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (videoEl && videoEl.srcObject) {
        (videoEl.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusIcon = (status: 'checking' | 'success' | 'error') => {
    switch (status) {
      case 'checking':
        return <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleJoinClass = () => {
    router.push(`/class/${params.classId}/live`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-0 mb-4">
          {t('badge')}
        </Badge>
        <h1 className="text-2xl font-bold text-white mb-2">{classData.topic}</h1>
        <p className="text-slate-400">
          {formatDateTime(classData.scheduledAt)} • {t('durationMin', { n: classData.duration })}
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Video Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/5 border-white/10 overflow-hidden">
            <div className="aspect-video bg-slate-800 relative">
              {isCameraOn && deviceStatus.camera === 'success' ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {deviceStatus.camera === 'checking' ? (
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-spin" />
                      <p className="text-slate-400 text-sm">{t('checkingCamera')}</p>
                    </div>
                  ) : deviceStatus.camera === 'error' ? (
                    <div className="text-center">
                      <VideoOff className="w-12 h-12 text-red-500 mx-auto mb-2" />
                      <p className="text-red-400 text-sm">{t('cameraError')}</p>
                      {deviceErrors.camera && (
                        <p className="text-red-300 text-xs mt-1">{deviceErrors.camera}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <Avatar className="h-24 w-24 mx-auto mb-2 border-2 border-white/20">
                        <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-3xl">
                          B
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-slate-400 text-sm">{t('cameraOff')}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Controls overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className={`w-12 h-12 rounded-full ${
                    isCameraOn
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-red-500 border-red-500 text-white'
                  }`}
                  onClick={() => setIsCameraOn(!isCameraOn)}
                >
                  {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={`w-12 h-12 rounded-full ${
                    isMicOn
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-red-500 border-red-500 text-white'
                  }`}
                  onClick={() => setIsMicOn(!isMicOn)}
                >
                  {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Device Checks & Class Info */}
        <div className="space-y-6">
          {/* Device Checks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">{t('deviceCheck')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Camera */}
                <div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-slate-400" />
                      <span className="text-white">{t('camera')}</span>
                    </div>
                    {getStatusIcon(deviceStatus.camera)}
                  </div>
                  {deviceErrors.camera && (
                    <p className="text-xs text-red-400 mt-1 px-3">{deviceErrors.camera}</p>
                  )}
                </div>

                {/* Microphone */}
                <div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mic className="w-5 h-5 text-slate-400" />
                      <span className="text-white">{t('microphone')}</span>
                    </div>
                    {getStatusIcon(deviceStatus.microphone)}
                  </div>
                  {deviceErrors.microphone && (
                    <p className="text-xs text-red-400 mt-1 px-3">{deviceErrors.microphone}</p>
                  )}
                </div>

                {/* Speaker */}
                <div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Speaker className="w-5 h-5 text-slate-400" />
                      <span className="text-white">{t('speaker')}</span>
                    </div>
                    {getStatusIcon(deviceStatus.speaker)}
                  </div>
                  {deviceErrors.speaker && (
                    <p className="text-xs text-red-400 mt-1 px-3">{deviceErrors.speaker}</p>
                  )}
                </div>

                {/* Network */}
                <div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Wifi className="w-5 h-5 text-slate-400" />
                      <div>
                        <span className="text-white">{t('network')}</span>
                        {networkSpeed && (
                          <p className="text-xs text-slate-500">{networkSpeed}</p>
                        )}
                      </div>
                    </div>
                    {getStatusIcon(deviceStatus.network)}
                  </div>
                  {deviceErrors.network && (
                    <p className="text-xs text-red-400 mt-1 px-3">{deviceErrors.network}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Teacher Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-[#3B82F6]/30">
                    <AvatarImage src={classData.teacher.avatar} />
                    <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6]">
                      {classData.teacher.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-slate-400">{t('teacher')}</p>
                    <p className="font-semibold text-white">{classData.teacher.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardContent className="p-4">
                <h4 className="font-semibold text-amber-400 mb-2">{t('tips')}</h4>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• {t('tip1')}</li>
                  <li>• {t('tip2')}</li>
                  <li>• {t('tip3')}</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Join Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 text-center"
      >
        <Button
          size="lg"
          className="bg-emerald-500 hover:bg-emerald-500/90 min-w-[200px]"
          onClick={handleJoinClass}
          disabled={!allChecksComplete}
        >
          {allChecksComplete ? (
            <>
              {t('joinClass')}
              <ChevronRight className="w-5 h-5 ml-2" />
            </>
          ) : (
            <>
              {t('joining')}
              <RefreshCw className="w-5 h-5 ml-2 animate-spin" />
            </>
          )}
        </Button>
        <p className="text-xs text-slate-500 mt-2">{t('earlyNote')}</p>
      </motion.div>
    </div>
  );
}
