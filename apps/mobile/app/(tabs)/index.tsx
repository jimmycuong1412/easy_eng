import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useAuth,
  useGemsBalance,
  useStreak,
  useWeeklyGoal,
  useProgressReport,
} from '@easyeng/core';

/**
 * Student dashboard (home tab). Reuses the same core data hooks as the web
 * dashboard — proving the shared data layer end to end on React Native.
 */

function StatCard({
  label,
  value,
  color,
  loading,
}: {
  label: string;
  value: string | number;
  color: string;
  loading?: boolean;
}) {
  return (
    <View className="flex-1 bg-bg-secondary rounded-card p-4">
      <Text className="text-text-muted text-xs mb-1">{label}</Text>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text className="text-2xl font-bold" style={{ color }}>
          {value}
        </Text>
      )}
    </View>
  );
}

function ProgressRow({
  label,
  actual,
  target,
}: {
  label: string;
  actual: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
  return (
    <View className="gap-1.5">
      <View className="flex-row justify-between">
        <Text className="text-text-secondary text-[13px]">{label}</Text>
        <Text className="text-text-muted text-[13px]">
          {actual}/{target}
        </Text>
      </View>
      <View className="h-2 rounded-full bg-bg-primary overflow-hidden">
        <View
          className="h-2 rounded-full bg-accent-primary"
          style={{ width: `${pct}%` }}
        />
      </View>
    </View>
  );
}

function NavLink({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      className="flex-1 bg-bg-secondary rounded-card p-4 items-center gap-1"
      onPress={onPress}
    >
      <Text className="text-2xl">{icon}</Text>
      <Text className="text-text-secondary text-xs text-center">{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { balance, isLoading: gemsLoading } = useGemsBalance();
  const { streak, loading: streakLoading } = useStreak();
  const { progress, loading: goalLoading } = useWeeklyGoal();
  const { report, loading: reportLoading } = useProgressReport();

  return (
    <ScrollView
      className="flex-1 bg-bg-primary"
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, gap: 16 }}
    >
      {/* Greeting */}
      <View>
        <Text className="text-text-muted text-sm">Xin chào,</Text>
        <Text className="text-text-primary text-2xl font-bold" numberOfLines={1}>
          {user?.email ?? 'bạn'}
        </Text>
      </View>

      {/* Top stats: gems (tap → top-up screen) + streak */}
      <View className="flex-row gap-3">
        <Pressable className="flex-1" onPress={() => router.push('/gems')}>
          <StatCard label="Gems" value={balance} color="#ec4899" loading={gemsLoading} />
        </Pressable>
        <StatCard
          label="Streak"
          value={`${streak?.currentStreak ?? 0}🔥`}
          color="#fbbf24"
          loading={streakLoading}
        />
      </View>

      {/* Progress report stats */}
      <View className="flex-row gap-3">
        <StatCard
          label="Tổng XP"
          value={report?.total_xp ?? 0}
          color="#7c5cff"
          loading={reportLoading}
        />
        <StatCard
          label="Buổi đã học"
          value={report?.total_sessions_completed ?? 0}
          color="#34d399"
          loading={reportLoading}
        />
      </View>

      {/* Weekly goal */}
      <View className="bg-bg-secondary rounded-card p-4 gap-3">
        <Text className="text-text-primary text-base font-semibold">Mục tiêu tuần này</Text>
        {goalLoading ? (
          <ActivityIndicator color="#7c5cff" />
        ) : progress ? (
          <View className="gap-3">
            <ProgressRow
              label="Buổi học"
              actual={progress.actual_sessions}
              target={progress.target_sessions}
            />
            <ProgressRow
              label="Từ vựng"
              actual={progress.actual_vocab}
              target={progress.target_vocab}
            />
            <ProgressRow
              label="Ngày streak"
              actual={progress.actual_streak_days}
              target={progress.target_streak_days}
            />
          </View>
        ) : (
          <Text className="text-text-muted text-[13px]">Chưa đặt mục tiêu tuần này.</Text>
        )}
      </View>

      {/* Quick links to free features */}
      <View className="gap-3">
        <Text className="text-text-primary text-base font-semibold">Khám phá</Text>
        <View className="flex-row gap-3">
          <NavLink icon="📖" label="Bài học" onPress={() => router.push('/(tabs)/lessons')} />
          <NavLink icon="📝" label="Từ vựng" onPress={() => router.push('/(tabs)/vocabulary')} />
          <NavLink icon="📈" label="Tiến độ" onPress={() => router.push('/(tabs)/progress')} />
        </View>
      </View>

      {/* Sign out */}
      <Pressable
        className="bg-bg-elevated rounded-btn py-3.5 items-center mt-2"
        onPress={signOut}
      >
        <Text className="text-text-primary text-base font-semibold">Đăng xuất</Text>
      </Pressable>
    </ScrollView>
  );
}
