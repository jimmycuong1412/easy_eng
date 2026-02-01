'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GemEarnedToastProps {
  activityType: string;
  gemsEarned: number;
  newBalance: number;
  onClose?: () => void;
  autoHideDuration?: number; // milliseconds, default 5000
}

const ACTIVITY_LABELS: Record<string, string> = {
  lesson_completion: 'Lesson Completed',
  attendance_streak: 'Attendance Streak',
  referral: 'Referral Bonus',
  profile_completion: 'Profile Complete',
  first_review: 'First Review',
  daily_login: 'Daily Login',
  quiz_completion: 'Quiz Completed',
  manual_award: 'Bonus Award',
};

const ACTIVITY_MESSAGES: Record<string, string> = {
  lesson_completion: 'Great job completing your lesson!',
  attendance_streak: 'Amazing streak! Keep it up!',
  referral: 'Thanks for inviting friends!',
  profile_completion: 'Your profile is now 100% complete!',
  first_review: 'Thanks for your first review!',
  daily_login: 'Welcome back today!',
  quiz_completion: 'Excellent quiz performance!',
  manual_award: 'Special bonus awarded!',
};

export default function GemEarnedToast({
  activityType,
  gemsEarned,
  newBalance,
  onClose,
  autoHideDuration = 5000,
}: GemEarnedToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [autoHideDuration]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      // Wait for animation to complete before calling onClose
      setTimeout(onClose, 300);
    }
  };

  const activityLabel = ACTIVITY_LABELS[activityType] || activityType;
  const activityMessage = ACTIVITY_MESSAGES[activityType] || 'You earned gems!';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-4 right-4 z-50 max-w-md"
        >
          <Alert className="border-2 border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100 shadow-lg relative pr-12">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Icon */}
            <div className="flex items-start gap-3">
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1.1, 1.1, 1.1, 1],
                }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
              </motion.div>

              {/* Content */}
              <div className="flex-1 space-y-1">
                <AlertDescription className="font-semibold text-base">
                  {activityLabel}
                </AlertDescription>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {activityMessage}
                </p>

                {/* Gems Earned */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="flex items-center gap-2 mt-2 p-2 rounded-md bg-green-100 dark:bg-green-900"
                >
                  <span className="text-2xl">💎</span>
                  <div>
                    <div className="font-bold text-lg text-green-700 dark:text-green-300">
                      +{gemsEarned} Gems
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      New balance: {newBalance} gems
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Usage Example:
 *
 * <GemEarnedToast
 *   activityType="lesson_completion"
 *   gemsEarned={50}
 *   newBalance={350}
 *   onClose={() => console.log('Toast closed')}
 *   autoHideDuration={5000}
 * />
 */
