import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTeachers, useGemsBalance } from '@easyeng/core';

interface Teacher {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

/**
 * Find-teachers tab — lists active teachers (core getTeachers) and links to each
 * teacher's booking screen. Shows the user's gem balance so they know if they
 * can afford a session (200 gems).
 */
export default function TeachersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { balance } = useGemsBalance();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = (await getTeachers()) as Teacher[] | null;
        setTeachers(data ?? []);
      } catch (err) {
        console.error('getTeachers error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View className="flex-1 bg-bg-primary" style={{ paddingTop: insets.top + 16 }}>
      <View className="px-5 pb-3 flex-row items-center justify-between">
        <Text className="text-text-primary text-2xl font-bold">Tìm giáo viên</Text>
        <View className="bg-bg-secondary rounded-full px-3 py-1">
          <Text className="text-accent-gem text-sm font-semibold">{balance} 💎</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7c5cff" />
        </View>
      ) : (
        <FlatList
          data={teachers}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 12 }}
          ListEmptyComponent={
            <Text className="text-text-muted text-center mt-8">Chưa có giáo viên nào.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              className="bg-bg-secondary rounded-card p-4 flex-row items-center gap-3"
              onPress={() =>
                router.push({
                  pathname: '/teachers/[id]',
                  params: { id: item.id, name: item.full_name ?? '', bio: item.bio ?? '' },
                })
              }
            >
              <View className="w-12 h-12 rounded-full bg-bg-elevated items-center justify-center">
                <Text className="text-xl">👨‍🏫</Text>
              </View>
              <View className="flex-1">
                <Text className="text-text-primary text-base font-semibold">
                  {item.full_name ?? 'Giáo viên'}
                </Text>
                {item.bio ? (
                  <Text className="text-text-muted text-[13px]" numberOfLines={1}>
                    {item.bio}
                  </Text>
                ) : null}
              </View>
              <Text className="text-accent-primary text-lg">›</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
