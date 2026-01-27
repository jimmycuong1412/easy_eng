'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

type UserRole = 'student' | 'teacher' | 'parent';

const roleOptions: { value: UserRole; label: string; icon: string; description: string }[] = [
  {
    value: 'student',
    label: 'Học sinh',
    icon: '📚',
    description: 'Học tiếng Anh với giáo viên',
  },
  {
    value: 'teacher',
    label: 'Giáo viên',
    icon: '👨‍🏫',
    description: 'Dạy và kiếm thu nhập',
  },
  {
    value: 'parent',
    label: 'Phụ huynh',
    icon: '👪',
    description: 'Quản lý tài khoản con em',
  },
];

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, isLoading, error } = useAuth();

  const [step, setStep] = React.useState<'role' | 'details'>('role');
  const [selectedRole, setSelectedRole] = React.useState<UserRole | null>(null);
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!fullName.trim()) {
      setFormError('Vui lòng nhập họ tên');
      return;
    }

    if (!email) {
      setFormError('Vui lòng nhập email');
      return;
    }

    if (password.length < 8) {
      setFormError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      await signUp(email, password, fullName);
      setSuccess(true);
    } catch (err) {
      setFormError('Không thể tạo tài khoản. Email có thể đã được sử dụng.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setFormError('Không thể đăng ký bằng Google');
    }
  };

  // Success message
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
            <CardTitle className="text-2xl">Kiểm tra email của bạn</CardTitle>
            <CardDescription>
              Chúng tôi đã gửi link xác nhận đến <strong>{email}</strong>. 
              Vui lòng kiểm tra hộp thư và click vào link để hoàn tất đăng ký.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push('/auth/login')}>
              Quay lại đăng nhập
            </Button>
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
          <CardTitle className="text-2xl">
            {step === 'role' ? 'Chọn vai trò của bạn' : 'Tạo tài khoản'}
          </CardTitle>
          <CardDescription>
            {step === 'role'
              ? 'Bạn muốn sử dụng EasyEng với vai trò nào?'
              : `Đăng ký với vai trò ${roleOptions.find((r) => r.value === selectedRole)?.label}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error messages */}
          {(formError || error) && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              {formError || error?.message}
            </div>
          )}

          {step === 'role' ? (
            // Role selection step
            <div className="space-y-3">
              {roleOptions.map((role) => (
                <button
                  key={role.value}
                  onClick={() => handleRoleSelect(role.value)}
                  className="w-full p-4 rounded-xl border border-border-default bg-bg-surface hover:bg-bg-elevated hover:border-border-focus transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl group-hover:scale-110 transition-transform">
                      {role.icon}
                    </span>
                    <div>
                      <div className="font-semibold text-text-primary">{role.label}</div>
                      <div className="text-sm text-text-secondary">{role.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Details step
            <>
              {/* Back button */}
              <button
                onClick={() => setStep('role')}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                ← Chọn vai trò khác
              </button>

              {/* Google Sign Up */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Đăng ký bằng Google
              </Button>

              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-surface px-2 text-text-muted text-sm">
                  hoặc
                </span>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Nguyễn Văn An"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>

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

                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Ít nhất 8 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full" isLoading={isLoading}>
                  Tạo tài khoản
                </Button>
              </form>

              {/* Terms */}
              <p className="text-xs text-text-muted text-center">
                Bằng việc đăng ký, bạn đồng ý với{' '}
                <Link href="/terms" className="text-accent-primary hover:underline">
                  Điều khoản sử dụng
                </Link>{' '}
                và{' '}
                <Link href="/privacy" className="text-accent-primary hover:underline">
                  Chính sách bảo mật
                </Link>
              </p>
            </>
          )}

          {/* Login link */}
          <p className="text-center text-sm text-text-secondary">
            Đã có tài khoản?{' '}
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
