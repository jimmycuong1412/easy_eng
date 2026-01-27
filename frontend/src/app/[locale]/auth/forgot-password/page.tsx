'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const { resetPassword, isLoading, error } = useAuth();

  const [email, setEmail] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email) {
      setFormError('Vui lòng nhập email');
      return;
    }

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setFormError('Không thể gửi email khôi phục. Vui lòng thử lại.');
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card variant="glass" className="border-border-default text-center">
          <CardHeader>
            <div className="text-6xl mb-4">📧</div>
            <CardTitle className="text-2xl">Kiểm tra email</CardTitle>
            <CardDescription>
              Nếu email <strong>{email}</strong> tồn tại trong hệ thống, bạn sẽ nhận được 
              link khôi phục mật khẩu. Vui lòng kiểm tra hộp thư (kể cả spam).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login">
              <Button variant="outline">Quay lại đăng nhập</Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <Card variant="glass" className="border-border-default">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Quên mật khẩu?</CardTitle>
          <CardDescription>
            Nhập email của bạn và chúng tôi sẽ gửi link khôi phục mật khẩu
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error messages */}
          {(formError || error) && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              {formError || error?.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Gửi link khôi phục
            </Button>
          </form>

          <p className="text-center text-sm text-text-secondary">
            Nhớ mật khẩu rồi?{' '}
            <Link
              href="/auth/login"
              className="text-accent-primary hover:underline font-medium"
            >
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
