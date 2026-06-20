import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useGemsBalance, useStreak } from '@easyeng/core';

/**
 * Home/dashboard tab. Reuses the same core data hooks as the web dashboard —
 * useAuth, useGemsBalance, useStreak — proving the shared data layer end to end.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { balance, isLoading: gemsLoading } = useGemsBalance();
  const { streak } = useStreak();

  return (
    <ScrollView
      className="flex-1 bg-bg-primary"
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, gap: 16 }}
    >
      <View>
        <Text className="text-text-muted text-sm">Xin chào,</Text>
        <Text className="text-text-primary text-2xl font-bold">{user?.email}</Text>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 bg-bg-secondary rounded-card p-4">
          <Text className="text-text-muted text-xs">Gems</Text>
          {gemsLoading ? (
            <ActivityIndicator color="#ec4899" />
          ) : (
            <Text className="text-accent-gem text-3xl font-bold">{balance}</Text>
          )}
        </View>
        <View className="flex-1 bg-bg-secondary rounded-card p-4">
          <Text className="text-text-muted text-xs">Streak</Text>
          <Text className="text-accent-gold text-3xl font-bold">
            {streak?.currentStreak ?? 0}🔥
          </Text>
        </View>
      </View>

      <Pressable
        className="bg-bg-elevated rounded-btn py-3.5 items-center mt-2"
        onPress={signOut}
      >
        <Text className="text-text-primary text-base font-semibold">Đăng xuất</Text>
      </Pressable>
    </ScrollView>
  );
}
