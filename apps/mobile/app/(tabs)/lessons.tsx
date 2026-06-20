import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Lessons / learning-path tab. Static B2 curriculum (8 units, 24 weeks) ported
 * from the web learning-path page — UI-only, no DB. Links to the onboarding
 * level quiz to (re)assess level.
 */

type UnitState = 'done' | 'current' | 'next' | 'locked';

interface Unit {
  n: string;
  title: string;
  desc: string;
  state: UnitState;
  lessons: number;
  weeks: string;
  pct?: number;
}

const UNITS: Unit[] = [
  { n: 'I', title: 'Nền tảng', desc: 'Âm thanh, câu đơn giản, sắp xếp sự việc theo thời gian.', state: 'done', lessons: 12, weeks: 'Tuần 1–3' },
  { n: 'II', title: 'Giao tiếp hằng ngày', desc: 'Hỏi, trả lời, nhắc lại lịch sự.', state: 'done', lessons: 10, weeks: 'Tuần 4–6' },
  { n: 'III', title: 'Kể chuyện nhỏ', desc: 'Thì quá khứ, mốc thời gian, nói thẳng vào vấn đề.', state: 'done', lessons: 14, weeks: 'Tuần 7–9' },
  { n: 'IV', title: 'Ý kiến, nhẹ nhàng', desc: 'Nói mềm mỏng, đồng ý, phản bác không gây mất lòng.', state: 'current', lessons: 11, weeks: 'Tuần 10–12', pct: 66 },
  { n: 'V', title: 'Nói về công việc', desc: 'Mô tả công việc của bạn và những gì bạn muốn làm.', state: 'next', lessons: 13, weeks: 'Tuần 13–15' },
  { n: 'VI', title: 'Nếu, khi, trừ khi', desc: 'Câu điều kiện, giả định, kế hoạch chưa chắc xảy ra.', state: 'locked', lessons: 12, weeks: 'Tuần 16–18' },
  { n: 'VII', title: 'Đọc bầu không khí', desc: 'Giọng điệu, văn phong, nhận ra điều không được nói.', state: 'locked', lessons: 10, weeks: 'Tuần 19–21' },
  { n: 'VIII', title: 'Vượt ngoài giáo trình', desc: 'Thành ngữ, tiếng lóng, những thứ bạn không học trong sách.', state: 'locked', lessons: 9, weeks: 'Tuần 22–24' },
];

const STATE_META: Record<UnitState, { label: string; color: string; badge: string }> = {
  done: { label: 'Hoàn thành', color: '#34d399', badge: '✓' },
  current: { label: 'Đang học', color: '#7c5cff', badge: '▶' },
  next: { label: 'Tiếp theo', color: '#60a5fa', badge: '·' },
  locked: { label: 'Chưa mở', color: '#5b6093', badge: '🔒' },
};

function UnitCard({ unit }: { unit: Unit }) {
  const meta = STATE_META[unit.state];
  return (
    <View
      className="bg-bg-secondary rounded-card p-4 gap-2"
      style={{ opacity: unit.state === 'locked' ? 0.6 : 1 }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: meta.color + '22' }}
        >
          <Text style={{ color: meta.color, fontWeight: '700' }}>{unit.n}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-text-primary text-base font-bold">{unit.title}</Text>
          <Text className="text-text-muted text-[12px]">
            {unit.weeks} · {unit.lessons} bài
          </Text>
        </View>
        <Text style={{ color: meta.color, fontSize: 11, fontWeight: '600' }}>{meta.label}</Text>
      </View>
      <Text className="text-text-secondary text-[13px]">{unit.desc}</Text>
      {unit.state === 'current' && unit.pct != null ? (
        <View className="h-2 rounded-full bg-bg-primary overflow-hidden mt-1">
          <View className="h-2 rounded-full bg-accent-primary" style={{ width: `${unit.pct}%` }} />
        </View>
      ) : null}
    </View>
  );
}

export default function LessonsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const doneCount = UNITS.filter((u) => u.state === 'done').length;

  return (
    <ScrollView
      className="flex-1 bg-bg-primary"
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, gap: 14 }}
    >
      <View>
        <Text className="text-accent-cookie text-[11px] uppercase tracking-widest">
          Khóa học của bạn · B2 Trên Trung Cấp
        </Text>
        <Text className="text-text-primary text-2xl font-bold mt-1">Lộ trình học</Text>
        <Text className="text-text-muted text-sm">
          {doneCount} / {UNITS.length} chủ đề hoàn thành · 24 tuần
        </Text>
      </View>

      <Pressable
        className="bg-bg-secondary rounded-card p-4 flex-row items-center justify-between"
        onPress={() => router.push('/onboarding/quiz')}
      >
        <View className="flex-1">
          <Text className="text-text-primary text-sm font-semibold">Kiểm tra trình độ</Text>
          <Text className="text-text-muted text-[12px]">
            Làm bài đánh giá nhanh để cá nhân hóa lộ trình.
          </Text>
        </View>
        <Text className="text-accent-primary text-lg">›</Text>
      </Pressable>

      {UNITS.map((u) => (
        <UnitCard key={u.n} unit={u} />
      ))}
    </ScrollView>
  );
}
