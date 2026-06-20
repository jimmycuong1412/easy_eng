import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSavedWords, type SavedWord } from '@easyeng/core';

/**
 * Flashcard SRS review session. Loads only due words (useSavedWords(true)),
 * shows one card at a time (tap to flip term ↔ meaning), and grades with
 * again/hard/good via the core review() RPC. Logic (scheduling) lives in core;
 * this screen is purely UI.
 */

type Grade = 'again' | 'hard' | 'good';

const GRADES: { key: Grade; label: string; color: string }[] = [
  { key: 'again', label: 'Lại', color: '#ef4444' },
  { key: 'hard', label: 'Khó', color: '#fbbf24' },
  { key: 'good', label: 'Tốt', color: '#34d399' },
];

export default function FlashcardReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Due-only deck for this session. Snapshot once so grading doesn't reshuffle.
  const { words, loading, review } = useSavedWords(true);
  const deck = useMemo<SavedWord[]>(() => words, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grading, setGrading] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const card = deck[index];

  const handleGrade = async (grade: Grade) => {
    if (!card || grading) return;
    setGrading(true);
    try {
      await review(card.vocabulary_item_id, grade);
    } finally {
      setGrading(false);
      setReviewed((n) => n + 1);
      setFlipped(false);
      setIndex((i) => i + 1);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7c5cff" />
      </View>
    );
  }

  // Deck finished (or nothing was due)
  if (!card) {
    return (
      <View
        className="flex-1 bg-bg-primary items-center justify-center px-8"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-5xl mb-3">🎉</Text>
        <Text className="text-text-primary text-xl font-bold mb-1">Xong rồi!</Text>
        <Text className="text-text-muted text-center mb-6">
          {reviewed > 0 ? `Đã ôn ${reviewed} thẻ.` : 'Không có thẻ nào cần ôn hôm nay.'}
        </Text>
        <Pressable
          className="bg-accent-primary rounded-btn py-3 px-6"
          onPress={() => router.back()}
        >
          <Text className="text-white text-base font-semibold">Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-primary px-5" style={{ paddingTop: insets.top + 12 }}>
      {/* Progress */}
      <View className="flex-row items-center justify-between mb-4">
        <Pressable onPress={() => router.back()}>
          <Text className="text-text-muted text-base">✕</Text>
        </Pressable>
        <Text className="text-text-muted text-sm">
          {index + 1} / {deck.length}
        </Text>
      </View>

      {/* Card — tap to flip */}
      <Pressable
        className="flex-1 bg-bg-secondary rounded-card items-center justify-center p-6 mb-5"
        onPress={() => setFlipped((f) => !f)}
      >
        {!flipped ? (
          <View className="items-center gap-2">
            <Text className="text-text-primary text-3xl font-bold text-center">{card.term}</Text>
            {card.ipa ? <Text className="text-text-muted text-base">/{card.ipa}/</Text> : null}
            <Text className="text-text-muted text-xs mt-4">Chạm để xem nghĩa</Text>
          </View>
        ) : (
          <View className="items-center gap-3">
            <Text className="text-accent-primary text-2xl font-bold text-center">
              {card.gloss_vi}
            </Text>
            {card.example_en ? (
              <Text className="text-text-secondary text-base italic text-center">
                {card.example_en}
              </Text>
            ) : null}
            {card.example_vi ? (
              <Text className="text-text-muted text-sm text-center">{card.example_vi}</Text>
            ) : null}
          </View>
        )}
      </Pressable>

      {/* Grade buttons — only after flip */}
      <View
        className="flex-row gap-3"
        style={{ paddingBottom: insets.bottom + 16, opacity: flipped ? 1 : 0.35 }}
        pointerEvents={flipped ? 'auto' : 'none'}
      >
        {GRADES.map((g) => (
          <Pressable
            key={g.key}
            className="flex-1 rounded-btn py-3.5 items-center"
            style={{ backgroundColor: g.color }}
            disabled={grading}
            onPress={() => handleGrade(g.key)}
          >
            <Text className="text-white text-base font-semibold">{g.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
