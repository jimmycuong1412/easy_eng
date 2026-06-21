import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCometChatAuthToken } from '@easyeng/core';

/**
 * Live-class screen (foundation). Fetches the CometChat auth token via the
 * shared edge function (getCometChatAuthToken) to prove the cross-platform auth
 * flow works. The actual video/chat UI uses the CometChat RN SDK
 * (@cometchat/chat-sdk-react-native + calls SDK) which is a native module — it
 * requires an EAS dev-client build to run, so the call UI is wired in the
 * native-build step. Until then this confirms token retrieval + readiness.
 */
export default function LiveClassScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { teacherId } = useLocalSearchParams<{ teacherId?: string }>();

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Pre-registers the teacher peer + mints this user's token.
        await getCometChatAuthToken(teacherId);
        setStatus('ready');
      } catch (err: any) {
        setError(err?.message ?? 'Không lấy được token CometChat');
        setStatus('error');
      }
    })();
  }, [teacherId]);

  return (
    <View
      className="flex-1 bg-bg-primary items-center justify-center px-8"
      style={{ paddingTop: insets.top }}
    >
      {status === 'loading' ? (
        <>
          <ActivityIndicator size="large" color="#7c5cff" />
          <Text className="text-text-muted text-sm mt-3">Đang kết nối lớp học…</Text>
        </>
      ) : status === 'error' ? (
        <>
          <Text className="text-4xl mb-2">⚠️</Text>
          <Text className="text-text-primary text-lg font-bold mb-1">Không kết nối được</Text>
          <Text className="text-text-muted text-center text-[13px] mb-6">{error}</Text>
          <Pressable className="bg-bg-elevated rounded-btn py-3 px-6" onPress={() => router.back()}>
            <Text className="text-text-primary text-base font-semibold">Quay lại</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text className="text-5xl mb-3">🎥</Text>
          <Text className="text-text-primary text-xl font-bold mb-1">Sẵn sàng vào lớp</Text>
          <Text className="text-text-muted text-center text-[13px] mb-6">
            Đã xác thực CometChat. Giao diện video/chat trực tiếp sẽ chạy trên bản
            build native (EAS dev-client).
          </Text>
          <Pressable className="bg-bg-elevated rounded-btn py-3 px-6" onPress={() => router.back()}>
            <Text className="text-text-primary text-base font-semibold">Quay lại</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
