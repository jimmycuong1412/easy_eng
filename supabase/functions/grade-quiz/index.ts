// Task: T188 - Quiz grading
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req: Request) => {
  const { attempt_id } = await req.json();

  const { data: attempt } = await supabase.from('quiz_attempts').select('*, quiz:quizzes(*)').eq('id', attempt_id).single();
  const { data: questions } = await supabase.from('quiz_questions').select('*').eq('quiz_id', attempt.quiz_id);

  let earnedPoints = 0;
  let totalPoints = 0;

  for (const q of questions!) {
    totalPoints += q.points;
    if (attempt.answers[q.id] === q.correct_answer) earnedPoints += q.points;
  }

  const score = Math.round((earnedPoints / totalPoints) * 100);
  const passed = score >= attempt.quiz.passing_score;

  await supabase.from('quiz_attempts').update({
    score,
    total_points: totalPoints,
    earned_points: earnedPoints,
    passed,
    completed_at: new Date().toISOString(),
  }).eq('id', attempt_id);

  // Award Gems based on score
  const gemsAwarded = score >= 90 ? 30 : score >= 75 ? 20 : 10;
  if (passed) {
    await supabase.functions.invoke('award-gems', {
      body: { student_id: attempt.student_id, amount: gemsAwarded, reason: 'quiz_completion' },
    });
    await supabase.from('quiz_attempts').update({ gems_awarded: gemsAwarded }).eq('id', attempt_id);
  }

  return new Response(JSON.stringify({ success: true, score, passed, gems_awarded: passed ? gemsAwarded : 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
