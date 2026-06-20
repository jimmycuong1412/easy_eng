import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@easyeng/core';

/**
 * Register screen — NativeWind styling, core useAuth.signUp for sign-up.
 * On success Supabase may require email confirmation; we show a notice and send
 * the user to login.
 */
export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, isLoading, error } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setLocalError(null);
    if (!fullName.trim()) return setLocalError('Vui lòng nhập họ tên.');
    if (password.length < 6) return setLocalError('Mật khẩu cần ít nhất 6 ký tự.');
    if (password !== confirm) return setLocalError('Mật khẩu nhập lại không khớp.');
    try {
      await signUp(email.trim(), password, fullName.trim());
      setDone(true);
    } catch {
      /* error surfaced via useAuth error */
    }
  };

  if (done) {
    return (
      <View
        className="flex-1 bg-bg-primary items-center justify-center px-8"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-5xl mb-3">✉️</Text>
        <Text className="text-text-primary text-xl font-bold mb-1">Kiểm tra email</Text>
        <Text className="text-text-muted text-center mb-6">
          Chúng tôi đã gửi liên kết xác nhận tới {email}. Xác nhận rồi đăng nhập nhé.
        </Text>
        <Pressable
          className="bg-accent-primary rounded-btn py-3 px-6"
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text className="text-white text-base font-semibold">Tới đăng nhập</Text>
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
        <Text className="text-text-primary text-2xl font-bold">Tạo tài khoản</Text>
        <Text className="text-text-muted text-sm mb-2">Miễn phí — bắt đầu học ngay</Text>

        <TextInput
          className="bg-bg-primary border border-border-default rounded-btn px-4 py-3 text-text-primary text-base"
          placeholder="Họ và tên"
          placeholderTextColor="#8a90b8"
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          className="bg-bg-primary border border-border-default rounded-btn px-4 py-3 text-text-primary text-base"
          placeholder="Email"
          placeholderTextColor="#8a90b8"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="bg-bg-primary border border-border-default rounded-btn px-4 py-3 text-text-primary text-base"
          placeholder="Mật khẩu (ít nhất 6 ký tự)"
          placeholderTextColor="#8a90b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          className="bg-bg-primary border border-border-default rounded-btn px-4 py-3 text-text-primary text-base"
          placeholder="Nhập lại mật khẩu"
          placeholderTextColor="#8a90b8"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        {(localError || error) ? (
          <Text className="text-accent-cookie text-[13px]">{localError ?? error?.message}</Text>
        ) : null}

        <Pressable
          className="bg-accent-primary rounded-btn py-3.5 items-center mt-1"
          disabled={isLoading}
          onPress={handleSubmit}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-semibold">Đăng ký</Text>
          )}
        </Pressable>

        <View className="flex-row justify-center gap-1 mt-1">
          <Text className="text-text-muted text-sm">Đã có tài khoản?</Text>
          <Link href="/(auth)/login" className="text-accent-primary text-sm font-semibold">
            Đăng nhập
          </Link>
        </View>
      </View>
    </View>
  );
}
