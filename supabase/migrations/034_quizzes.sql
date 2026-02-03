-- Task: T177 - Create quizzes table

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,

  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  time_limit_minutes INTEGER,
  passing_score INTEGER DEFAULT 75 CHECK (passing_score BETWEEN 0 AND 100),

  max_attempts INTEGER DEFAULT 2,
  shuffle_questions BOOLEAN DEFAULT TRUE,
  show_correct_answers BOOLEAN DEFAULT TRUE,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quizzes_teacher ON quizzes(teacher_id);
CREATE INDEX idx_quizzes_class ON quizzes(class_id);
CREATE INDEX idx_quizzes_active ON quizzes(is_active) WHERE is_active = TRUE;
