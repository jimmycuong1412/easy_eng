import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@easyeng/core';

/**
 * Forgot-password screen — core useAuth.resetPassword sends the reset email.
 * The reset link redirects to the app via the platform adapter's getOrigin().
 */
export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { resetPassword, error } = useAuth();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch {
      /* error surfaced via useAuth error */
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <View
        className="flex-1 bg-bg-primary items-center justify-center px-8"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-5xl mb-3">📧</Text>
        <Text className="text-text-primary text-xl font-bold mb-1">Đã gửi liên kết</Text>
        <Text className="text-text-muted text-center mb-6">
          Nếu {email} có tài khoản, bạn sẽ nhận được email đặt lại mật khẩu.
        </Text>
        <Pressable
          className="bg-accent-primary rounded-btn py-3 px-6"
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text className="text-white text-base font-semibold">Quay lại đăng nhập</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-bg-primary items-center justify-center px-6"
      style={{ paddingTop: insets.top }}
    >
      <View className="w-full max-w-[380px] bg-bg-secondary rounded-card p-6 gap-3">
        <Text className="text-text-primary text-2xl font-bold">Quên mật khẩu</Text>
        <Text className="text-text-muted text-sm mb-2">
          Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
        </Text>

        <TextInput
          className="bg-bg-primary border border-border-default rounded-btn px-4 py-3 text-text-primary text-base"
          placeholder="Email"
          placeholderTextColor="#8a90b8"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {error ? <Text className="text-accent-cookie text-[13px]">{error.message}</Text> : null}

        <Pressable
          className="bg-accent-primary rounded-btn py-3.5 items-center mt-1"
          disabled={submitting}
          onPress={handleSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-semibold">Gửi liên kết</Text>
          )}
        </Pressable>

        <View className="flex-row justify-center gap-1 mt-1">
          <Link href="/(auth)/login" className="text-accent-primary text-sm font-semibold">
            Quay lại đăng nhập
          </Link>
        </View>
      </View>
    </View>
  );
}
