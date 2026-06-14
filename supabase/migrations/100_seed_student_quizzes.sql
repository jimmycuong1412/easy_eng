-- ============================================================================
-- 100: Seed student quizzes (Growth Plan — Phase 3.2 content)
-- ============================================================================
-- Adds Everyday Vocabulary / Prepositions / Verb Tenses quizzes so the student
-- quiz page has real content. correct_answer = option index as text.
-- Applied to production 2026-06-14 via MCP.

DO $$
DECLARE v_teacher uuid := '7a46e4e2-782c-471a-ba1b-cea449e75028';
        q1 uuid; q2 uuid; q3 uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM quizzes WHERE title = 'Everyday Vocabulary') THEN RETURN; END IF;

  INSERT INTO quizzes (teacher_id, title, description, difficulty, passing_score, max_attempts, is_active)
  VALUES (v_teacher, 'Everyday Vocabulary', 'Từ vựng giao tiếp hằng ngày', 'beginner', 70, 99, true)
  RETURNING id INTO q1;
  INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index) VALUES
   (q1, 'What do you say when you meet someone in the morning?', 'multiple_choice', '["Good night","Good morning","Goodbye","See you"]', '1', 1, 0),
   (q1, 'Which word means "ăn"?', 'multiple_choice', '["sleep","drink","eat","run"]', '2', 1, 1),
   (q1, '"Cảm ơn" in English is ___.', 'multiple_choice', '["Sorry","Please","Thank you","Welcome"]', '2', 1, 2),
   (q1, 'A place where you buy food is a ___.', 'multiple_choice', '["school","market","hospital","bank"]', '1', 1, 3);

  INSERT INTO quizzes (teacher_id, title, description, difficulty, passing_score, max_attempts, is_active)
  VALUES (v_teacher, 'Prepositions Practice', 'Luyện giới từ in/on/at...', 'intermediate', 75, 99, true)
  RETURNING id INTO q2;
  INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index) VALUES
   (q2, 'I will meet you ___ Monday.', 'multiple_choice', '["in","on","at","by"]', '1', 1, 0),
   (q2, 'She lives ___ Hanoi.', 'multiple_choice', '["in","on","at","to"]', '0', 1, 1),
   (q2, 'The class starts ___ 9 a.m.', 'multiple_choice', '["in","on","at","of"]', '2', 1, 2),
   (q2, 'The book is ___ the table.', 'multiple_choice', '["in","on","at","by"]', '1', 1, 3);

  INSERT INTO quizzes (teacher_id, title, description, difficulty, passing_score, max_attempts, is_active)
  VALUES (v_teacher, 'Verb Tenses', 'Ôn thì hiện tại, quá khứ, tương lai', 'intermediate', 75, 99, true)
  RETURNING id INTO q3;
  INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index) VALUES
   (q3, 'Yesterday I ___ to the cinema.', 'multiple_choice', '["go","goes","went","gone"]', '2', 1, 0),
   (q3, 'She ___ English every day.', 'multiple_choice', '["study","studies","studied","studying"]', '1', 1, 1),
   (q3, 'They ___ to Da Nang next week.', 'multiple_choice', '["go","will go","went","going"]', '1', 1, 2),
   (q3, 'I ___ my homework right now.', 'multiple_choice', '["do","did","am doing","done"]', '2', 1, 3);
END $$;
