import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveLearningProfile } from '@easyeng/core';

/**
 * Onboarding level-assessment quiz — 10 questions ported from the web
 * student/onboarding/quiz page. Scores the answers, maps to a CEFR-ish level,
 * computes weak skill areas, and persists via the shared saveLearningProfile RPC.
 */

type Skill = 'grammar' | 'vocabulary' | 'reading';

interface Question {
  id: number;
  skill: Skill;
  text: string;
  options: string[];
  correct: number;
}

const QUESTIONS: Question[] = [
  { id: 1, skill: 'grammar', text: 'Choose the correct sentence:', options: ['She go to school every day.', 'She goes to school every day.', 'She going to school every day.', 'She gone to school every day.'], correct: 1 },
  { id: 2, skill: 'vocabulary', text: '"Abundant" means:', options: ['Very little', 'Very large in amount', 'Very fast', 'Very old'], correct: 1 },
  { id: 3, skill: 'grammar', text: 'Which is correct?', options: ['I have seen him yesterday.', 'I saw him yesterday.', 'I had seen him yesterday.', 'I see him yesterday.'], correct: 1 },
  { id: 4, skill: 'vocabulary', text: 'What does "persevere" mean?', options: ['To give up easily', 'To continue despite difficulty', 'To move quickly', 'To speak loudly'], correct: 1 },
  { id: 5, skill: 'grammar', text: 'Complete: "If I _____ rich, I would travel the world."', options: ['am', 'was', 'were', 'be'], correct: 2 },
  { id: 6, skill: 'reading', text: '"The results were inconclusive." This means the results:', options: ['Were very clear', 'Did not give a definite answer', 'Were very positive', 'Were very negative'], correct: 1 },
  { id: 7, skill: 'grammar', text: 'Choose the correct passive form: "They built this house in 1990."', options: ['This house built in 1990.', 'This house was built in 1990.', 'This house is built in 1990.', 'This house were built in 1990.'], correct: 1 },
  { id: 8, skill: 'vocabulary', text: '"Eloquent" describes someone who:', options: ['Is very quiet', 'Speaks fluently and persuasively', 'Works very hard', 'Learns quickly'], correct: 1 },
  { id: 9, skill: 'grammar', text: 'Which sentence uses the present perfect correctly?', options: ['I have visited Paris last year.', 'I visited Paris already.', 'I have already visited Paris.', 'I have visit Paris.'], correct: 2 },
  { id: 10, skill: 'reading', text: '"Despite his lack of experience, he performed remarkably." "Despite" here means:', options: ['Because of', 'Although', 'Therefore', 'However'], correct: 1 },
];

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Sơ cấp',
  elementary: 'Cơ bản',
  'pre-intermediate': 'Trước trung cấp',
  intermediate: 'Trung cấp',
  'upper-intermediate': 'Trung-cao',
  advanced: 'Nâng cao',
};

function scoreToLevel(score: number): string {
  if (score <= 2) return 'beginner';
  if (score <= 4) return 'elementary';
  if (score <= 5) return 'pre-intermediate';
  if (score <= 7) return 'intermediate';
  if (score <= 8) return 'upper-intermediate';
  return 'advanced';
}

/** Skills where the user got <60% correct. */
function weakAreas(answers: number[]): string[] {
  const skills: Skill[] = ['grammar', 'vocabulary', 'reading'];
  return skills.filter((skill) => {
    const qs = QUESTIONS.filter((q) => q.skill === skill);
    const correct = qs.filter((q) => answers[QUESTIONS.indexOf(q)] === q.correct).length;
    return correct < qs.length * 0.6;
  });
}

export default function OnboardingQuizScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; level: string } | null>(null);

  const q = QUESTIONS[index];
  const progress = useMemo(() => (index / QUESTIONS.length) * 100, [index]);

  const handleNext = async () => {
    if (selected == null) return;
    const nextAnswers = [...answers, selected];
    setSelected(null);

    if (index + 1 < QUESTIONS.length) {
      setAnswers(nextAnswers);
      setIndex((i) => i + 1);
      return;
    }

    // Last question — score + persist.
    const score = nextAnswers.filter((a, i) => a === QUESTIONS[i].correct).length;
    const level = scoreToLevel(score);
    setSubmitting(true);
    try {
      await saveLearningProfile({
        assessedLevel: level,
        quizScore: score,
        weakAreas: weakAreas(nextAnswers),
      });
      setResult({ score, level });
    } catch {
      Alert.alert('Lỗi', 'Không lưu được kết quả. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <View className="flex-1 bg-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7c5cff" />
        <Text className="text-text-muted text-sm mt-3">Đang chấm điểm…</Text>
      </View>
    );
  }

  if (result) {
    return (
      <View
        className="flex-1 bg-bg-primary items-center justify-center px-8"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-5xl mb-3">🎯</Text>
        <Text className="text-text-primary text-xl font-bold mb-1">Hoàn thành!</Text>
        <Text className="text-text-muted text-center mb-1">
          Bạn trả lời đúng {result.score}/{QUESTIONS.length} câu.
        </Text>
        <Text className="text-accent-primary text-lg font-bold mb-6">
          Trình độ: {LEVEL_LABELS[result.level] ?? result.level}
        </Text>
        <Pressable
          className="bg-accent-primary rounded-btn py-3 px-6"
          onPress={() => router.replace('/(tabs)')}
        >
          <Text className="text-white text-base font-semibold">Tới trang chủ</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-primary px-5" style={{ paddingTop: insets.top + 12 }}>
      {/* Progress */}
      <View className="flex-row items-center justify-between mb-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-text-muted text-base">✕</Text>
        </Pressable>
        <Text className="text-text-muted text-sm">
          {index + 1} / {QUESTIONS.length}
        </Text>
      </View>
      <View className="h-2 rounded-full bg-bg-secondary overflow-hidden mb-6">
        <View className="h-2 rounded-full bg-accent-primary" style={{ width: `${progress}%` }} />
      </View>

      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
        <Text className="text-text-muted text-[12px] uppercase tracking-widest">{q.skill}</Text>
        <Text className="text-text-primary text-xl font-bold mb-2">{q.text}</Text>

        {q.options.map((opt, i) => {
          const active = selected === i;
          return (
            <Pressable
              key={i}
              className="rounded-card p-4 border"
              style={{
                backgroundColor: active ? '#7c5cff22' : '#0d1a4a',
                borderColor: active ? '#7c5cff' : 'rgba(91,141,255,0.13)',
              }}
              onPress={() => setSelected(i)}
            >
              <Text style={{ color: active ? '#fff' : '#c8ccea', fontSize: 15 }}>{opt}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          className="rounded-btn py-3.5 items-center"
          style={{ backgroundColor: selected != null ? '#7c5cff' : '#2a3a7a' }}
          disabled={selected == null}
          onPress={handleNext}
        >
          <Text className="text-white text-base font-semibold">
            {index + 1 < QUESTIONS.length ? 'Tiếp theo' : 'Hoàn thành'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
