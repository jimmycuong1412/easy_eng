'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UnauthorizedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const attemptedPath = searchParams.get('from');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center"
            >
              <ShieldX className="w-10 h-10 text-red-400" />
            </motion.div>
            <CardTitle className="text-2xl font-bold text-white">
              Truy cập bị từ chối
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-slate-400">
              Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.
            </p>

            {attemptedPath && (
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Đường dẫn yêu cầu</p>
                <code className="text-sm text-slate-300 break-all">
                  {attemptedPath}
                </code>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
              <Button
                className="flex-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                onClick={() => router.push('/dashboard')}
              >
                <Home className="w-4 h-4 mr-2" />
                Về trang chủ
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
