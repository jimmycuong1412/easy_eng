-- Task: T180 - Create quiz RLS policies

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Quizzes
CREATE POLICY "Teachers can manage their quizzes" ON quizzes FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "Students can view active quizzes" ON quizzes FOR SELECT USING (is_active = TRUE);

-- Questions
CREATE POLICY "Teachers can manage their quiz questions" ON quiz_questions FOR ALL
  USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.teacher_id = auth.uid()));
CREATE POLICY "Students can view questions for active quizzes" ON quiz_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.is_active = TRUE));

-- Attempts
CREATE POLICY "Students can view their own attempts" ON quiz_attempts FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can create their own attempts" ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Teachers can view attempts for their quizzes" ON quiz_attempts FOR SELECT
  USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_attempts.quiz_id AND quizzes.teacher_id = auth.uid()));
