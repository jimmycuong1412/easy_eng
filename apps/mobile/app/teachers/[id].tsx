import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bookSlot, useGemsBalance } from '@easyeng/core';

const GEMS_PER_SESSION = 200;
const TIME_SLOTS = ['09:00', '10:00', '14:00', '15:00', '19:00', '20:00'];

/** Next 7 days as {label, value(YYYY-MM-DD)} in VN local terms. */
function nextDays(count: number) {
  const days: { label: string; value: string }[] = [];
  const fmt = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ label: i === 0 ? 'Hôm nay' : fmt.format(d), value });
  }
  return days;
}

export default function TeacherBookingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, name, bio } = useLocalSearchParams<{ id: string; name?: string; bio?: string }>();
  const { balance, refreshBalance } = useGemsBalance();

  const days = useMemo(() => nextDays(7), []);
  const [date, setDate] = useState(days[0]?.value ?? '');
  const [time, setTime] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const canAfford = balance >= GEMS_PER_SESSION;

  const handleBook = async () => {
    if (!id || !time || booking) return;
    if (!canAfford) {
      Alert.alert('Không đủ Gems', `Bạn cần ${GEMS_PER_SESSION} Gems để đặt buổi học.`);
      return;
    }
    setBooking(true);
    try {
      await bookSlot({ teacherId: id, date, time });
      await refreshBalance();
      Alert.alert('Đặt lịch thành công', 'Buổi học đã được xác nhận.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const code = err?.message ?? '';
      const msg = code.includes('insufficient_gems')
        ? 'Bạn không đủ Gems.'
        : code.includes('duplicate_booking')
          ? 'Bạn đã đặt buổi học cho khung giờ này rồi.'
          : 'Đặt lịch thất bại. Vui lòng thử lại.';
      Alert.alert('Lỗi', msg);
    } finally {
      setBooking(false);
    }
  };

  return (
    <View className="flex-1 bg-bg-primary" style={{ paddingTop: insets.top + 12 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <Text className="text-text-muted text-base">‹ Quay lại</Text>
          </Pressable>
          <View className="bg-bg-secondary rounded-full px-3 py-1">
            <Text className="text-accent-gem text-sm font-semibold">{balance} 💎</Text>
          </View>
        </View>

        {/* Teacher */}
        <View className="bg-bg-secondary rounded-card p-4 flex-row items-center gap-3">
          <View className="w-14 h-14 rounded-full bg-bg-elevated items-center justify-center">
            <Text className="text-2xl">👨‍🏫</Text>
          </View>
          <View className="flex-1">
            <Text className="text-text-primary text-lg font-bold">
              {name ?? 'Giáo viên'}
            </Text>
            {bio ? <Text className="text-text-muted text-[13px]">{bio}</Text> : null}
          </View>
        </View>

        {/* Date picker */}
        <View className="gap-2">
          <Text className="text-text-primary text-base font-semibold">Chọn ngày</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {days.map((d) => {
              const active = d.value === date;
              return (
                <Pressable
                  key={d.value}
                  className="rounded-btn px-4 py-2.5"
                  style={{ backgroundColor: active ? '#7c5cff' : '#0d1a4a' }}
                  onPress={() => { setDate(d.value); setTime(null); }}
                >
                  <Text style={{ color: active ? '#fff' : '#c8ccea', fontWeight: active ? '700' : '400' }}>
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Time picker */}
        <View className="gap-2">
          <Text className="text-text-primary text-base font-semibold">Chọn giờ (giờ VN)</Text>
          <View className="flex-row flex-wrap gap-2">
            {TIME_SLOTS.map((t) => {
              const active = t === time;
              return (
                <Pressable
                  key={t}
                  className="rounded-btn px-5 py-3"
                  style={{ backgroundColor: active ? '#7c5cff' : '#0d1a4a' }}
                  onPress={() => setTime(t)}
                >
                  <Text style={{ color: active ? '#fff' : '#c8ccea', fontWeight: active ? '700' : '400' }}>
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Book bar */}
      <View
        className="px-5 pt-3 border-t border-border-default"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Text className="text-text-muted text-[13px] mb-2 text-center">
          Buổi học 25 phút · {GEMS_PER_SESSION} 💎
        </Text>
        <Pressable
          className="rounded-btn py-3.5 items-center"
          style={{ backgroundColor: time && canAfford ? '#7c5cff' : '#2a3a7a' }}
          disabled={!time || booking}
          onPress={handleBook}
        >
          {booking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-semibold">
              {!time ? 'Chọn giờ để đặt' : !canAfford ? 'Không đủ Gems' : 'Đặt lịch'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
