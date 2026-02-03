-- Task: T179 - Create quiz_attempts table

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  answers JSONB NOT NULL, -- { question_id: answer }
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  total_points INTEGER NOT NULL,
  earned_points INTEGER NOT NULL,

  passed BOOLEAN NOT NULL,
  gems_awarded INTEGER DEFAULT 0,

  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  time_taken_seconds INTEGER,

  attempt_number INTEGER DEFAULT 1
);

CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id, completed_at);
CREATE UNIQUE INDEX idx_quiz_attempts_unique ON quiz_attempts(quiz_id, student_id, attempt_number);
