import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSavedWords, type SavedWord } from '@easyeng/core';

/**
 * Vocabulary list tab — the user's saved words (sổ từ vựng), via the shared
 * core useSavedWords hook. Shows how many are due for review and links to the
 * flashcard SRS session.
 */

function isDue(word: SavedWord): boolean {
  return new Date(word.srs_due_date).getTime() <= Date.now();
}

function WordCard({ word }: { word: SavedWord }) {
  const due = isDue(word);
  return (
    <View className="bg-bg-secondary rounded-card p-4 gap-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-text-primary text-lg font-bold">{word.term}</Text>
        {due ? (
          <View className="bg-accent-cookie/20 rounded-full px-2 py-0.5">
            <Text className="text-accent-cookie text-[11px] font-semibold">Cần ôn</Text>
          </View>
        ) : null}
      </View>
      {word.ipa ? <Text className="text-text-muted text-xs">/{word.ipa}/</Text> : null}
      <Text className="text-text-secondary text-sm">{word.gloss_vi}</Text>
      {word.example_en ? (
        <Text className="text-text-muted text-[13px] italic mt-1">{word.example_en}</Text>
      ) : null}
    </View>
  );
}

export default function VocabularyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { words, loading, refresh } = useSavedWords();

  const dueCount = words.filter(isDue).length;

  return (
    <View className="flex-1 bg-bg-primary" style={{ paddingTop: insets.top + 16 }}>
      <View className="px-5 pb-3">
        <Text className="text-text-primary text-2xl font-bold">Sổ từ vựng</Text>
        <Text className="text-text-muted text-sm">
          {words.length} từ đã lưu{dueCount > 0 ? ` · ${dueCount} cần ôn` : ''}
        </Text>
      </View>

      {dueCount > 0 ? (
        <View className="px-5 pb-3">
          <Pressable
            className="bg-accent-primary rounded-btn py-3 items-center"
            onPress={() => router.push('/vocabulary/review')}
          >
            <Text className="text-white text-base font-semibold">
              Ôn {dueCount} thẻ với Flashcard
            </Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7c5cff" />
        </View>
      ) : words.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-2">📭</Text>
          <Text className="text-text-secondary text-center">
            Chưa có từ nào. Lưu từ khi học bài để ôn tập sau.
          </Text>
        </View>
      ) : (
        <FlatList
          data={words}
          keyExtractor={(w) => w.save_id}
          renderItem={({ item }) => <WordCard word={item} />}
          contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 12 }}
          onRefresh={refresh}
          refreshing={loading}
        />
      )}
    </View>
  );
}
