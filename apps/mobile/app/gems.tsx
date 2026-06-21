import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useGemsBalance } from '@easyeng/core';

/**
 * Gems screen. Per app-store policy, gems are NOT sold in-app (digital currency
 * would trigger Apple IAP / Google Play Billing). The app shows the balance and
 * how gems are used; topping up opens the web purchase flow in a browser.
 */

const WEB_GEMS_URL = 'https://easyeng-dev.vercel.app/vi/student/gems/buy';

export default function GemsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { balance, isLoading } = useGemsBalance();

  return (
    <ScrollView
      className="flex-1 bg-bg-primary"
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, gap: 16 }}
    >
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()}>
          <Text className="text-text-muted text-base">‹ Quay lại</Text>
        </Pressable>
      </View>

      {/* Balance */}
      <View className="bg-bg-secondary rounded-card p-6 items-center gap-1">
        <Text className="text-text-muted text-sm">Số dư Gems</Text>
        {isLoading ? (
          <ActivityIndicator color="#ec4899" />
        ) : (
          <Text className="text-accent-gem text-5xl font-bold">{balance} 💎</Text>
        )}
        <Text className="text-text-muted text-[13px] mt-2 text-center">
          Dùng Gems để đặt buổi học 1-1 (200 Gems / buổi).
        </Text>
      </View>

      {/* Top up — web only */}
      <View className="bg-bg-secondary rounded-card p-4 gap-3">
        <Text className="text-text-primary text-base font-semibold">Nạp thêm Gems</Text>
        <Text className="text-text-muted text-[13px]">
          Việc mua Gems được thực hiện trên website EasyEng. Nhấn để mở trang nạp
          Gems trong trình duyệt.
        </Text>
        <Pressable
          className="bg-accent-primary rounded-btn py-3.5 items-center"
          onPress={() => WebBrowser.openBrowserAsync(WEB_GEMS_URL)}
        >
          <Text className="text-white text-base font-semibold">Nạp Gems trên web</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
