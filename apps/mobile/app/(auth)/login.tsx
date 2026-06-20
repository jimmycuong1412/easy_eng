import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@easyeng/core';

/**
 * Login screen — NativeWind styling, core useAuth for the actual sign-in.
 * Editorial design tokens (bg-*, accent-*, text-*) come from the shared
 * @easyeng/config tailwind preset.
 */
export default function LoginScreen() {
  const { signIn, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View className="flex-1 bg-bg-primary items-center justify-center px-6">
      <View className="w-full max-w-[380px] bg-bg-secondary rounded-card p-6 gap-3">
        <Text className="text-text-primary text-2xl font-bold">EasyEng</Text>
        <Text className="text-text-muted text-sm mb-2">Đăng nhập để tiếp tục</Text>

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
          placeholder="Mật khẩu"
          placeholderTextColor="#8a90b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text className="text-accent-cookie text-[13px]">{error.message}</Text> : null}

        <Pressable
          className="bg-accent-primary rounded-btn py-3.5 items-center mt-1"
          disabled={isLoading}
          onPress={() => {
            void signIn(email, password).catch(() => {
              /* error shown via the error state above */
            });
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-semibold">Đăng nhập</Text>
          )}
        </Pressable>

        <View className="items-center mt-1">
          <Link href="/(auth)/forgot-password" className="text-text-muted text-sm">
            Quên mật khẩu?
          </Link>
        </View>

        <View className="flex-row justify-center gap-1 mt-1">
          <Text className="text-text-muted text-sm">Chưa có tài khoản?</Text>
          <Link href="/(auth)/register" className="text-accent-primary text-sm font-semibold">
            Đăng ký
          </Link>
        </View>
      </View>
    </View>
  );
}
