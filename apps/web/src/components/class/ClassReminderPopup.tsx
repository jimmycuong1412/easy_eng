'use client';

/**
 * ClassReminderPopup
 *
 * App-wide modal that nudges the user to join an imminent or live class.
 * Driven by useClassReminder; mounted once in the dashboard layout.
 */

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, X, Clock } from 'lucide-react';
import type { ClassReminder } from '@/hooks/useClassReminder';

interface Props {
  reminder: ClassReminder | null;
  onDismiss: (classId: string) => void;
}

export default function ClassReminderPopup({ reminder, onDismiss }: Props) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'vi';
  const [pulse, setPulse] = useState(false);

  // brief attention pulse whenever a new reminder appears
  useEffect(() => {
    if (!reminder) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1200);
    return () => clearTimeout(t);
  }, [reminder?.classId, reminder?.kind]);

  if (!reminder) return null;

  const isLive = reminder.kind === 'live_waiting';
  const startLabel = new Date(reminder.startTime).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const heading = isLive ? 'Lớp học đang diễn ra!' : 'Lớp học sắp bắt đầu!';
  const sub = isLive
    ? 'Người kia đang chờ bạn trong lớp. Vào ngay để bắt đầu buổi học.'
    : reminder.minutesUntilStart <= 0
      ? 'Lớp học của bạn bắt đầu ngay bây giờ.'
      : `Lớp học bắt đầu sau ${reminder.minutesUntilStart} phút. Hãy chuẩn bị sẵn sàng.`;

  const join = () => {
    onDismiss(reminder.classId);
    router.push(`/${locale}/class/${reminder.classId}/live`);
  };

  return (
    <AnimatePresence>
      <motion.div
        key={reminder.classId + reminder.kind}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(3, 8, 26, 0.72)', backdropFilter: 'blur(4px)' }}
        onClick={() => onDismiss(reminder.classId)}
      >
        <motion.div
          initial={{ scale: 0.92, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
          style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}
        >
          {/* Accent top strip */}
          <div style={{ height: 4, background: isLive ? '#22c55e' : 'var(--et-coral)' }} />

          <button
            onClick={() => onDismiss(reminder.classId)}
            aria-label="Đóng"
            className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-lg transition-colors"
            style={{ color: 'var(--et-fg-2)' }}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="px-7 py-7 text-center">
            <motion.div
              animate={pulse ? { scale: [1, 1.12, 1] } : {}}
              transition={{ duration: 0.6, repeat: pulse ? 1 : 0 }}
              className="mx-auto grid h-16 w-16 place-items-center rounded-2xl"
              style={{
                background: isLive ? 'rgba(34,197,94,0.14)' : 'var(--et-coral-2, rgba(255,122,89,0.14))',
              }}
            >
              <Video className="h-8 w-8" style={{ color: isLive ? '#22c55e' : 'var(--et-coral)' }} />
            </motion.div>

            <h2 className="mt-5 text-xl font-bold" style={{ color: 'var(--et-fg)' }}>
              {heading}
            </h2>

            <div
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg-2)' }}
            >
              <Clock className="h-3.5 w-3.5" />
              {reminder.title} · {startLabel}
            </div>

            <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--et-fg-2)' }}>
              {sub}
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => onDismiss(reminder.classId)}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg-2)', border: '1px solid var(--et-line)' }}
              >
                Để sau
              </button>
              <button
                onClick={join}
                className="flex-[1.4] rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                style={{ background: isLive ? '#22c55e' : 'var(--et-coral)' }}
              >
                Vào lớp ngay
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
