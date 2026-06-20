import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Lessons tab — placeholder for the Phase 5 lessons/learning-path screens.
 */
export default function LessonsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 bg-bg-primary items-center justify-center px-6"
      style={{ paddingTop: insets.top }}
    >
      <Text className="text-text-primary text-xl font-bold">Bài học</Text>
      <Text className="text-text-muted text-sm mt-2 text-center">
        Màn hình lộ trình học sẽ được xây dựng ở các bước tiếp theo của Phase 5.
      </Text>
    </View>
  );
}
