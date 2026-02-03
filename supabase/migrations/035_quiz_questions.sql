-- Task: T178 - Create quiz_questions table

CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,

  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank')),

  options JSONB, -- Array of answer options for multiple choice
  correct_answer TEXT NOT NULL,
  explanation TEXT,

  points INTEGER DEFAULT 1 CHECK (points > 0),
  order_index INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id, order_index);
