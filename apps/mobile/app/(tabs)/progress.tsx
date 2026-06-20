import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProgressReport } from '@easyeng/core';

/**
 * Progress report tab — detailed learning stats from the shared core
 * useProgressReport hook (same data as the web report page).
 */

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Sơ cấp',
  elementary: 'Cơ bản',
  'pre-intermediate': 'Trước trung cấp',
  intermediate: 'Trung cấp',
  'upper-intermediate': 'Trung-cao',
  advanced: 'Nâng cao',
};

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <View className="flex-1 bg-bg-secondary rounded-card p-4 gap-1">
      <Text className="text-2xl font-bold" style={{ color }}>
        {value}
      </Text>
      <Text className="text-text-secondary text-[12px] font-medium">{label}</Text>
      {sub ? (
        <Text className="text-[11px]" style={{ color }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { report, loading } = useProgressReport();

  if (loading) {
    return (
      <View className="flex-1 bg-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7c5cff" />
      </View>
    );
  }

  const r = report;

  return (
    <ScrollView
      className="flex-1 bg-bg-primary"
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, gap: 16 }}
    >
      <View>
        <Text className="text-text-primary text-2xl font-bold">Báo cáo tiến độ</Text>
        <Text className="text-text-muted text-sm">
          {new Date().toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </Text>
      </View>

      {/* Level badge */}
      {r?.current_level ? (
        <View
          className="rounded-card p-4 flex-row items-center gap-3"
          style={{ backgroundColor: 'rgba(244,122,89,0.10)' }}
        >
          <Text className="text-2xl">🏆</Text>
          <View>
            <Text className="text-accent-cookie text-[11px] uppercase tracking-widest">
              Trình độ của bạn
            </Text>
            <Text className="text-text-primary text-lg font-bold">
              {LEVEL_LABELS[r.current_level] ?? r.current_level}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Stats grid */}
      <View className="gap-3">
        <View className="flex-row gap-3">
          <StatCard
            label="Buổi học hoàn thành"
            value={r?.total_sessions_completed ?? 0}
            color="#ff7a59"
          />
          <StatCard
            label="Streak hiện tại"
            value={`${r?.current_streak ?? 0} ngày`}
            sub={`Kỷ lục: ${r?.longest_streak ?? 0} ngày`}
            color="#fbbf24"
          />
        </View>
        <View className="flex-row gap-3">
          <StatCard
            label="Từ vựng đã lưu"
            value={r?.total_vocab_saved ?? 0}
            sub={`${r?.total_vocab_reviewed ?? 0} đã ôn`}
            color="#60a5fa"
          />
          <StatCard label="Tổng XP" value={r?.total_xp ?? 0} color="#a78bfa" />
        </View>
        <View className="flex-row gap-3">
          <StatCard
            label="Ngày học (30 ngày)"
            value={r?.active_days_30 ?? 0}
            sub="ngày hoạt động"
            color="#2dd4bf"
          />
          <StatCard
            label="Bài học hoàn thành"
            value={r?.materials_completed ?? 0}
            color="#4ade80"
          />
        </View>
      </View>

      {/* Insights */}
      <View className="bg-bg-secondary rounded-card p-4 gap-3">
        <Text className="text-text-primary text-sm font-semibold">Nhận xét</Text>
        {(r?.total_vocab_saved ?? 0) < 10 ? (
          <Text className="text-text-secondary text-[13px]">
            💡 Lưu thêm từ vựng khi học để ôn tập dễ hơn — mục tiêu 20 từ/tuần.
          </Text>
        ) : null}
        {(r?.current_streak ?? 0) === 0 ? (
          <Text className="text-text-secondary text-[13px]">
            🔥 Học 1 buổi hôm nay để bắt đầu streak mới!
          </Text>
        ) : null}
        {(r?.current_streak ?? 0) >= 7 ? (
          <Text className="text-[13px]" style={{ color: '#4ade80' }}>
            🏆 Streak {r?.current_streak} ngày — tuyệt vời, giữ vững nhé!
          </Text>
        ) : null}
        {(r?.total_sessions_completed ?? 0) === 0 ? (
          <Text className="text-text-secondary text-[13px]">
            📚 Đặt lịch buổi học đầu tiên để bắt đầu hành trình học tiếng Anh.
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
