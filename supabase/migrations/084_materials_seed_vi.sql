-- Migration 084: Materials Library — Vietnamese seed catalog
-- Spec: research.md § R1, plan.md § scale
-- Date: 2026-05-10
--
-- Seeds 30 materials (5 per type × 6 types) plus tags and 1 curated collection.
-- All Vietnamese-first (vi is source of truth, en is mirror translation).
-- Uses an existing admin profile as author; the seed is idempotent via
-- INSERT ... ON CONFLICT DO NOTHING.

DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Find an existing admin to attribute seeds to
  SELECT id INTO v_admin_id FROM profiles WHERE role = 'admin' LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'No admin profile found — skipping materials seed';
    RETURN;
  END IF;

  -- ============================================================
  -- Tags
  -- ============================================================
  INSERT INTO material_tags (slug, label_vi, label_en) VALUES
    ('greeting',    'Chào hỏi',          'Greetings'),
    ('travel',      'Du lịch',           'Travel'),
    ('food',        'Ẩm thực',           'Food'),
    ('school',      'Trường học',        'School'),
    ('business',    'Kinh doanh',        'Business'),
    ('interview',   'Phỏng vấn xin việc','Job interview'),
    ('vietnam',     'Việt Nam',          'Vietnam'),
    ('tet',         'Tết Nguyên Đán',    'Lunar New Year'),
    ('ielts',       'IELTS',             'IELTS'),
    ('toeic',       'TOEIC',             'TOEIC'),
    ('vstep',       'VSTEP',             'VSTEP'),
    ('thpt',        'Thi tốt nghiệp THPT', 'High-school graduation'),
    ('grammar',     'Ngữ pháp',          'Grammar'),
    ('pronunciation','Phát âm',          'Pronunciation'),
    ('listening',   'Nghe',              'Listening')
  ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- 5× vocabulary_pack
  -- ============================================================
  INSERT INTO materials (slug, type, level, status, goal,
                         title_vi, title_en, summary_vi, summary_en,
                         body_vi, body_en, duration_min,
                         gems_reward, xp_reward, min_completion_pct,
                         author_id, published_at, published_by)
  VALUES
    ('vocab-greetings-a1', 'vocabulary_pack', 'a1', 'published', 'conversation',
     'Từ vựng chào hỏi cơ bản',
     'Basic greeting vocabulary',
     'Học 10 từ chào hỏi tiếng Anh thông dụng nhất, kèm phiên âm và ví dụ trong tình huống Việt Nam.',
     '10 essential English greetings with IPA and Vietnamese-context examples.',
     '# Chào hỏi cơ bản\n\nĐây là 10 từ chào hỏi bạn cần biết khi gặp người nước ngoài tại Việt Nam, đặc biệt là khách du lịch ở Hà Nội, Đà Nẵng và Sài Gòn.',
     '# Basic greetings\n\nTen greetings you need when meeting foreigners in Vietnam, especially tourists in Hanoi, Da Nang and Saigon.',
     8, 2, 30, 80, v_admin_id, now(), v_admin_id),

    ('vocab-food-a1', 'vocabulary_pack', 'a1', 'published', 'travel',
     'Từ vựng món ăn Việt Nam',
     'Vietnamese food vocabulary',
     'Học 12 món ăn Việt Nam phổ biến bằng tiếng Anh: phở, bún, bánh mì, gỏi cuốn…',
     '12 popular Vietnamese dishes in English: phở, bún, bánh mì, fresh spring rolls…',
     '# Món ăn Việt Nam\n\nKhi giới thiệu ẩm thực Việt cho bạn bè quốc tế, bạn cần biết tên các món ăn bằng tiếng Anh.',
     '# Vietnamese food\n\nWhen introducing Vietnamese cuisine to international friends, you need the English names of dishes.',
     10, 2, 30, 80, v_admin_id, now(), v_admin_id),

    ('vocab-school-a2', 'vocabulary_pack', 'a2', 'published', 'school',
     'Từ vựng trường học',
     'School vocabulary',
     '15 từ vựng quan trọng về trường học cho học sinh lớp 9–12.',
     '15 key school vocabulary words for grades 9–12.',
     '# Trường học\n\nBộ từ vựng này giúp bạn mô tả trường học, lớp học và hoạt động học tập của mình.',
     '# School\n\nThis vocabulary set helps you describe your school, classroom and study activities.',
     12, 2, 30, 80, v_admin_id, now(), v_admin_id),

    ('vocab-interview-b1', 'vocabulary_pack', 'b1', 'published', 'business',
     'Từ vựng phỏng vấn xin việc',
     'Job interview vocabulary',
     '20 thuật ngữ phỏng vấn quan trọng khi xin việc tại công ty đa quốc gia.',
     '20 key interview terms for applying at multinational companies.',
     '# Phỏng vấn xin việc\n\nLàm việc tại công ty nước ngoài đang là xu hướng. Bộ từ này giúp bạn tự tin trong vòng phỏng vấn tiếng Anh.',
     '# Job interview\n\nWorking at a foreign company is a growing trend. This vocabulary set helps you feel confident in English-language interviews.',
     15, 3, 40, 80, v_admin_id, now(), v_admin_id),

    ('vocab-ielts-academic-b2', 'vocabulary_pack', 'b2', 'published', 'ielts',
     'Từ vựng IELTS Academic — Chủ đề Education',
     'IELTS Academic — Education topic vocabulary',
     '25 từ vựng IELTS Band 6.5+ về chủ đề giáo dục.',
     '25 IELTS Band 6.5+ words on education.',
     '# IELTS — Education\n\nChủ đề Education xuất hiện trong khoảng 30% đề thi IELTS Writing Task 2.',
     '# IELTS — Education\n\nThe Education topic appears in roughly 30% of IELTS Writing Task 2 prompts.',
     20, 3, 40, 80, v_admin_id, now(), v_admin_id)
  ON CONFLICT (slug) DO NOTHING;

  -- Vocabulary items for the first vocab pack (representative; production seeds
  -- would have 8–12 per pack)
  INSERT INTO vocabulary_items (material_id, idx, term, pos, ipa, vi_phonetic_hint,
                                 gloss_vi, gloss_en, example_en, example_vi)
  SELECT m.id, v.idx, v.term, v.pos, v.ipa, v.vi_phonetic_hint,
         v.gloss_vi, v.gloss_en, v.example_en, v.example_vi
  FROM materials m,
       (VALUES
         (0, 'hello',       'interjection', '/həˈloʊ/',     'hơ-lâu',    'xin chào',          'standard greeting',     'Hello, nice to meet you.', 'Xin chào, rất vui được gặp bạn.'),
         (1, 'hi',          'interjection', '/haɪ/',         'hai',       'chào (thân mật)',   'casual greeting',       'Hi, how are you?',          'Chào, bạn khoẻ không?'),
         (2, 'good morning','phrase',       '/ɡʊd ˈmɔːrnɪŋ/','gút mooning','chào buổi sáng',    'morning greeting',      'Good morning, teacher.',    'Chào buổi sáng cô.'),
         (3, 'good evening','phrase',       '/ɡʊd ˈiːvnɪŋ/', 'gút ip-ning','chào buổi tối',     'evening greeting',      'Good evening, sir.',         'Chào buổi tối, anh.'),
         (4, 'goodbye',     'interjection', '/ɡʊdˈbaɪ/',     'gút-bai',   'tạm biệt',          'farewell',              'Goodbye, see you tomorrow.','Tạm biệt, hẹn ngày mai gặp lại.'),
         (5, 'see you',     'phrase',       '/siː juː/',     'si-iu',     'hẹn gặp lại',       'casual farewell',       'See you next week!',         'Hẹn gặp lại tuần sau!'),
         (6, 'thank you',   'phrase',       '/θæŋk juː/',    'thắng-iu',  'cảm ơn',            'expression of gratitude','Thank you for your help.',  'Cảm ơn bạn đã giúp đỡ.'),
         (7, 'sorry',       'adjective',    '/ˈsɒri/',       'so-ri',     'xin lỗi',           'apology',               'Sorry, I am late.',          'Xin lỗi, tôi đến muộn.'),
         (8, 'excuse me',   'phrase',       '/ɪkˈskjuːz miː/','ex-kiu mi', 'xin phép / làm phiền','attention-getter',    'Excuse me, where is the bus stop?', 'Làm phiền, bến xe buýt ở đâu?'),
         (9, 'nice to meet you','phrase',   '/naɪs tə miːt juː/','nai-stu-mit-iu','rất vui được gặp','introduction',     'Nice to meet you, Linh.',    'Rất vui được gặp Linh.')
       ) AS v(idx, term, pos, ipa, vi_phonetic_hint, gloss_vi, gloss_en, example_en, example_vi)
  WHERE m.slug = 'vocab-greetings-a1'
  ON CONFLICT (material_id, idx) DO NOTHING;

  -- ============================================================
  -- 5× grammar_lesson
  -- ============================================================
  INSERT INTO materials (slug, type, level, status, goal,
                         title_vi, title_en, summary_vi, summary_en,
                         body_vi, body_en, duration_min,
                         gems_reward, xp_reward, min_completion_pct,
                         author_id, published_at, published_by)
  VALUES
    ('grammar-present-simple-a1', 'grammar_lesson', 'a1', 'published', 'school',
     'Thì hiện tại đơn',
     'Present simple tense',
     'Cấu trúc, cách dùng và bài tập về thì hiện tại đơn.',
     'Form, usage and practice for the present simple tense.',
     '# Thì hiện tại đơn\n\n## Công thức\n- Khẳng định: S + V(s/es) + O\n- Phủ định: S + do/does + not + V\n- Câu hỏi: Do/Does + S + V?\n\n## Khi nào dùng?\nDùng để diễn tả thói quen hằng ngày, sự thật hiển nhiên.',
     '# Present simple\n\n## Form\n- Affirmative: S + V(s/es) + O\n- Negative: S + do/does + not + V\n- Question: Do/Does + S + V?\n\n## When to use\nFor habits and general truths.',
     10, 3, 40, 80, v_admin_id, now(), v_admin_id),

    ('grammar-past-simple-a2', 'grammar_lesson', 'a2', 'published', 'school',
     'Thì quá khứ đơn',
     'Past simple tense',
     'Cách chia động từ quá khứ và 20 động từ bất quy tắc thông dụng.',
     'Past tense conjugation and 20 common irregular verbs.',
     '# Thì quá khứ đơn\n\n## Công thức\n- Khẳng định: S + V(ed/V2) + O\n- Phủ định: S + did + not + V\n\n## Động từ bất quy tắc\nVí dụ: go → went, eat → ate, see → saw…',
     '# Past simple\n\n## Form\n- Affirmative: S + V(ed/V2) + O\n- Negative: S + did + not + V\n\n## Irregular verbs\nExamples: go → went, eat → ate, see → saw…',
     12, 3, 40, 80, v_admin_id, now(), v_admin_id),

    ('grammar-conditionals-b1', 'grammar_lesson', 'b1', 'published', 'ielts',
     'Câu điều kiện loại 1, 2, 3',
     'Conditional sentences (Type 1, 2, 3)',
     'Phân biệt 3 loại câu điều kiện thường gặp trong IELTS.',
     'Three types of conditional sentences common in IELTS.',
     '# Câu điều kiện\n\n## Loại 1 — có thật ở hiện tại/tương lai\nIf + S + V(s/es), S + will + V\n\n## Loại 2 — không có thật ở hiện tại\nIf + S + V2/Ved, S + would + V\n\n## Loại 3 — không có thật ở quá khứ\nIf + S + had + V3, S + would have + V3',
     '# Conditionals\n\n## Type 1 — real present/future\nIf + S + V(s/es), S + will + V\n\n## Type 2 — unreal present\nIf + S + V2/Ved, S + would + V\n\n## Type 3 — unreal past\nIf + S + had + V3, S + would have + V3',
     15, 3, 40, 80, v_admin_id, now(), v_admin_id),

    ('grammar-passive-voice-b1', 'grammar_lesson', 'b1', 'published', 'school',
     'Câu bị động',
     'Passive voice',
     'Chuyển đổi câu chủ động thành câu bị động ở mọi thì.',
     'Converting active sentences to passive across all tenses.',
     '# Câu bị động\n\nDùng khi muốn nhấn mạnh đối tượng nhận tác động thay vì người thực hiện hành động.',
     '# Passive voice\n\nUsed to emphasize the object/recipient instead of the actor.',
     12, 3, 40, 80, v_admin_id, now(), v_admin_id),

    ('grammar-reported-speech-b2', 'grammar_lesson', 'b2', 'published', 'ielts',
     'Câu tường thuật',
     'Reported speech',
     'Quy tắc lùi thì và đổi đại từ trong câu tường thuật.',
     'Backshift rules and pronoun changes in reported speech.',
     '# Câu tường thuật\n\n## Lùi thì\n- Hiện tại đơn → Quá khứ đơn\n- Hiện tại tiếp diễn → Quá khứ tiếp diễn\n- Quá khứ đơn → Quá khứ hoàn thành\n\n## Đổi đại từ và trạng từ thời gian',
     '# Reported speech\n\n## Backshift\n- Present simple → Past simple\n- Present continuous → Past continuous\n- Past simple → Past perfect\n\n## Pronoun and time-adverb changes',
     18, 3, 40, 80, v_admin_id, now(), v_admin_id)
  ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- 5× reading_passage
  -- ============================================================
  INSERT INTO materials (slug, type, level, status, goal,
                         title_vi, title_en, summary_vi, summary_en,
                         body_vi, body_en, duration_min,
                         gems_reward, xp_reward, min_completion_pct,
                         author_id, published_at, published_by)
  VALUES
    ('reading-hanoi-traffic-a2', 'reading_passage', 'a2', 'published', 'travel',
     'Giao thông Hà Nội qua mắt người nước ngoài',
     'Hanoi traffic through a foreigner''s eyes',
     'Bài đọc 200 từ về văn hoá giao thông Hà Nội, đầy đủ câu hỏi đọc hiểu.',
     '200-word reading on Hanoi traffic culture with comprehension questions.',
     '# Giao thông Hà Nội\n\nMillions of motorbikes fill the streets every morning. For foreigners visiting Hanoi for the first time, crossing the road can feel like a small adventure...',
     '# Hanoi traffic\n\nMillions of motorbikes fill the streets every morning. For foreigners visiting Hanoi for the first time, crossing the road can feel like a small adventure...',
     10, 3, 40, 60, v_admin_id, now(), v_admin_id),

    ('reading-tet-festival-b1', 'reading_passage', 'b1', 'published', 'travel',
     'Tết Nguyên Đán — Lễ hội quan trọng nhất Việt Nam',
     'Tết — Vietnam''s most important festival',
     'Bài đọc 350 từ về phong tục Tết, có chú thích thành ngữ.',
     '350-word passage on Tết customs with idiom notes.',
     '# Tết Nguyên Đán\n\nTết is the Lunar New Year and the most important holiday in Vietnam. Families gather to clean their homes, prepare special dishes such as bánh chưng, and visit relatives...',
     '# Lunar New Year\n\nTết is the Lunar New Year and the most important holiday in Vietnam. Families gather to clean their homes, prepare special dishes such as bánh chưng, and visit relatives...',
     12, 3, 40, 60, v_admin_id, now(), v_admin_id),

    ('reading-saigon-cafe-b1', 'reading_passage', 'b1', 'published', 'conversation',
     'Văn hoá cà phê Sài Gòn',
     'Saigon coffee culture',
     'Bài đọc 300 từ về thói quen uống cà phê ở Sài Gòn.',
     '300-word reading on Saigon''s coffee habits.',
     '# Cà phê Sài Gòn\n\nIn Saigon, coffee shops are everywhere — from small sidewalk stands to fashionable cafés. Locals love iced coffee with condensed milk, known as "cà phê sữa đá"...',
     '# Saigon coffee\n\nIn Saigon, coffee shops are everywhere — from small sidewalk stands to fashionable cafés. Locals love iced coffee with condensed milk, known as "cà phê sữa đá"...',
     10, 3, 40, 60, v_admin_id, now(), v_admin_id),

    ('reading-vietnam-economy-b2', 'reading_passage', 'b2', 'published', 'business',
     'Kinh tế Việt Nam trong thập kỷ qua',
     'Vietnam''s economy in the past decade',
     'Bài đọc 450 từ về tăng trưởng kinh tế Việt Nam, dành cho TOEIC 700+.',
     '450-word reading on Vietnam''s economic growth — TOEIC 700+.',
     '# Kinh tế Việt Nam\n\nOver the past decade, Vietnam has been one of the fastest-growing economies in Southeast Asia. Its GDP has more than doubled since 2015...',
     '# Vietnam''s economy\n\nOver the past decade, Vietnam has been one of the fastest-growing economies in Southeast Asia. Its GDP has more than doubled since 2015...',
     15, 3, 40, 60, v_admin_id, now(), v_admin_id),

    ('reading-climate-change-c1', 'reading_passage', 'c1', 'published', 'ielts',
     'Climate change and the Mekong Delta',
     'Climate change and the Mekong Delta',
     'IELTS-style 600-word passage with 8 comprehension questions.',
     'IELTS-style 600-word passage with 8 comprehension questions.',
     '# Mekong Delta — A region under pressure\n\nThe Mekong Delta in southern Vietnam is one of the world''s most fertile rice-growing regions. However, climate change is putting it at serious risk...',
     '# Mekong Delta — A region under pressure\n\nThe Mekong Delta in southern Vietnam is one of the world''s most fertile rice-growing regions. However, climate change is putting it at serious risk...',
     20, 3, 40, 60, v_admin_id, now(), v_admin_id)
  ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- 5× listening_audio
  -- ============================================================
  INSERT INTO materials (slug, type, level, status, goal,
                         title_vi, title_en, summary_vi, summary_en,
                         body_vi, body_en, duration_min,
                         gems_reward, xp_reward, min_completion_pct,
                         author_id, published_at, published_by)
  VALUES
    ('listening-airport-a1', 'listening_audio', 'a1', 'published', 'travel',
     'Nghe ở sân bay Nội Bài',
     'Listening at Noi Bai Airport',
     'Đoạn ghi âm 90 giây về thông báo sân bay, kèm phiên bản tiếng Việt.',
     '90-second airport announcement audio with Vietnamese translation.',
     '# Sân bay Nội Bài\n\nNghe đoạn thông báo và trả lời các câu hỏi bên dưới.',
     '# Noi Bai Airport\n\nListen to the announcement and answer the questions below.',
     8, 4, 50, 60, v_admin_id, now(), v_admin_id),

    ('listening-restaurant-a2', 'listening_audio', 'a2', 'published', 'conversation',
     'Đặt món ở nhà hàng',
     'Ordering at a restaurant',
     'Đoạn hội thoại 2 phút giữa khách và nhân viên.',
     '2-minute waiter–customer dialogue.',
     '# Đặt món\n\nNghe đoạn hội thoại sau và xác định món khách đã gọi.',
     '# Ordering food\n\nListen to the dialogue and identify what the customer ordered.',
     10, 4, 50, 60, v_admin_id, now(), v_admin_id),

    ('listening-news-headlines-b1', 'listening_audio', 'b1', 'published', 'business',
     'Tin tức buổi sáng',
     'Morning news headlines',
     'Tổng hợp 4 bản tin ngắn (tổng 3 phút).',
     '4 short news segments (3 minutes total).',
     '# Tin tức\n\nNghe 4 bản tin và ghi lại chủ đề chính.',
     '# News\n\nListen to 4 news segments and note the main topic.',
     12, 4, 50, 60, v_admin_id, now(), v_admin_id),

    ('listening-ielts-section1-b2', 'listening_audio', 'b2', 'published', 'ielts',
     'IELTS Listening — Section 1 mẫu',
     'IELTS Listening — Sample Section 1',
     'Đoạn ghi âm 4 phút theo định dạng IELTS Section 1.',
     '4-minute audio in IELTS Section 1 format.',
     '# IELTS Section 1\n\nĐiền vào chỗ trống dựa trên thông tin nghe được.',
     '# IELTS Section 1\n\nFill in the blanks based on the audio.',
     15, 4, 50, 60, v_admin_id, now(), v_admin_id),

    ('listening-ted-talk-c1', 'listening_audio', 'c1', 'published', 'study_abroad',
     'TED Talk — On the future of education',
     'TED Talk — On the future of education',
     'Đoạn TED Talk 5 phút, kèm bản ghi và bài tập từ vựng.',
     '5-minute TED Talk with transcript and vocabulary exercise.',
     '# TED Talk\n\nNghe và rút ra ý chính của diễn giả.',
     '# TED Talk\n\nListen and identify the speaker''s main idea.',
     20, 4, 50, 60, v_admin_id, now(), v_admin_id)
  ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- 5× dialogue
  -- ============================================================
  INSERT INTO materials (slug, type, level, status, goal,
                         title_vi, title_en, summary_vi, summary_en,
                         body_vi, body_en, duration_min,
                         gems_reward, xp_reward, min_completion_pct,
                         author_id, published_at, published_by)
  VALUES
    ('dialogue-meeting-friend-a1', 'dialogue', 'a1', 'published', 'conversation',
     'Gặp bạn mới',
     'Meeting a new friend',
     'Đoạn hội thoại đơn giản giữa Linh và một du khách Mỹ.',
     'Simple dialogue between Linh and a US tourist.',
     '# Gặp bạn\n\n**Linh:** Hi! Are you a tourist?\n**Tom:** Yes, I''m from California.\n**Linh:** Welcome to Hanoi!',
     '# Meeting\n\n**Linh:** Hi! Are you a tourist?\n**Tom:** Yes, I''m from California.\n**Linh:** Welcome to Hanoi!',
     6, 3, 40, 80, v_admin_id, now(), v_admin_id),

    ('dialogue-bargaining-a2', 'dialogue', 'a2', 'published', 'travel',
     'Mặc cả ở chợ Bến Thành',
     'Bargaining at Ben Thanh market',
     'Hội thoại mặc cả mua áo dài.',
     'Bargaining dialogue for an áo dài.',
     '# Mặc cả\n\n**Customer:** How much is this áo dài?\n**Seller:** 500,000 dong.\n**Customer:** Can you give me a discount?',
     '# Bargaining\n\n**Customer:** How much is this áo dài?\n**Seller:** 500,000 dong.\n**Customer:** Can you give me a discount?',
     8, 3, 40, 80, v_admin_id, now(), v_admin_id),

    ('dialogue-doctor-visit-b1', 'dialogue', 'b1', 'published', 'conversation',
     'Khám bệnh ở phòng khám',
     'A visit to the doctor',
     'Đoạn hội thoại giữa bệnh nhân và bác sĩ.',
     'Patient–doctor dialogue.',
     '# Khám bệnh\n\n**Doctor:** What seems to be the problem?\n**Patient:** I''ve had a headache for three days.',
     '# Doctor visit\n\n**Doctor:** What seems to be the problem?\n**Patient:** I''ve had a headache for three days.',
     10, 3, 40, 80, v_admin_id, now(), v_admin_id),

    ('dialogue-job-interview-b2', 'dialogue', 'b2', 'published', 'business',
     'Phỏng vấn xin việc tại công ty công nghệ',
     'Tech-company job interview',
     'Hội thoại 5 phút mô phỏng phỏng vấn lập trình viên.',
     '5-minute simulated developer interview.',
     '# Phỏng vấn\n\n**Interviewer:** Tell me about a challenging project you''ve worked on.\n**Candidate:** Recently I built a recommendation engine for an e-commerce app...',
     '# Interview\n\n**Interviewer:** Tell me about a challenging project you''ve worked on.\n**Candidate:** Recently I built a recommendation engine for an e-commerce app...',
     12, 3, 40, 80, v_admin_id, now(), v_admin_id),

    ('dialogue-business-meeting-c1', 'dialogue', 'c1', 'published', 'business',
     'Cuộc họp đối tác Singapore',
     'Meeting with a Singapore partner',
     'Hội thoại nâng cao trong cuộc họp kinh doanh.',
     'Advanced dialogue in a business meeting.',
     '# Họp đối tác\n\n**Partner:** Shall we revisit the timeline for the Q3 roll-out?\n**Manager:** Absolutely. Given the current resource constraints, I propose…',
     '# Partner meeting\n\n**Partner:** Shall we revisit the timeline for the Q3 roll-out?\n**Manager:** Absolutely. Given the current resource constraints, I propose…',
     15, 3, 40, 80, v_admin_id, now(), v_admin_id)
  ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- 5× mock_test
  -- ============================================================
  INSERT INTO materials (slug, type, level, status, goal,
                         title_vi, title_en, summary_vi, summary_en,
                         body_vi, body_en, duration_min,
                         gems_reward, xp_reward, min_completion_pct,
                         author_id, published_at, published_by)
  VALUES
    ('test-thpt-grammar-a2', 'mock_test', 'a2', 'published', 'school',
     'Đề luyện thi THPT — Ngữ pháp cơ bản',
     'High-school grammar practice test',
     '10 câu trắc nghiệm theo định dạng đề thi tốt nghiệp THPT.',
     '10 multiple-choice questions in high-school graduation format.',
     '# Đề luyện thi\n\nChọn đáp án đúng cho mỗi câu. Bài thi không tính gem hay XP — chỉ phản hồi điểm số và giải thích.',
     '# Practice test\n\nChoose the correct answer for each question. This test does not award gems or XP — score and explanation only.',
     20, 0, 0, 70, v_admin_id, now(), v_admin_id),

    ('test-toeic-listening-b1', 'mock_test', 'b1', 'published', 'toeic',
     'TOEIC Listening Practice — Part 1',
     'TOEIC Listening Practice — Part 1',
     '6 câu mô tả tranh kiểu TOEIC Part 1.',
     '6 picture-description questions in TOEIC Part 1 style.',
     '# TOEIC Part 1\n\nNghe và chọn câu mô tả đúng nhất.',
     '# TOEIC Part 1\n\nListen and choose the best description.',
     15, 0, 0, 70, v_admin_id, now(), v_admin_id),

    ('test-vstep-reading-b1', 'mock_test', 'b1', 'published', 'vstep',
     'VSTEP Reading — Đoạn 1',
     'VSTEP Reading — Passage 1',
     'Bài đọc + 5 câu hỏi theo định dạng VSTEP B1.',
     'Reading passage + 5 questions in VSTEP B1 format.',
     '# VSTEP Reading\n\nĐọc đoạn văn và trả lời các câu hỏi.',
     '# VSTEP Reading\n\nRead the passage and answer the questions.',
     20, 0, 0, 70, v_admin_id, now(), v_admin_id),

    ('test-ielts-reading-b2', 'mock_test', 'b2', 'published', 'ielts',
     'IELTS Reading Mini Test',
     'IELTS Reading Mini Test',
     'Mini-test 8 câu theo định dạng IELTS Academic Reading.',
     '8-question mini-test in IELTS Academic Reading format.',
     '# IELTS Reading\n\nĐọc đoạn văn và chọn đáp án đúng.',
     '# IELTS Reading\n\nRead the passage and choose the correct answers.',
     25, 0, 0, 70, v_admin_id, now(), v_admin_id),

    ('test-ielts-writing-c1', 'mock_test', 'c1', 'published', 'ielts',
     'IELTS Writing — Câu hỏi mẫu',
     'IELTS Writing — Sample prompts',
     '5 câu hỏi trắc nghiệm về kỹ thuật viết IELTS Task 2.',
     '5 multiple-choice questions on IELTS Task 2 writing technique.',
     '# IELTS Writing\n\nChọn câu trả lời đúng nhất về kỹ thuật viết.',
     '# IELTS Writing\n\nChoose the best answer about writing technique.',
     20, 0, 0, 70, v_admin_id, now(), v_admin_id)
  ON CONFLICT (slug) DO NOTHING;

  -- Mock-test items for the THPT grammar test (representative; full seed would
  -- have 10+ items per test)
  INSERT INTO mock_test_items (material_id, idx, format, prompt_vi, prompt_en,
                                options_en, options_vi, correct_index,
                                explanation_vi, points)
  SELECT m.id, t.idx, t.format, t.prompt_vi, t.prompt_en,
         t.options_en, t.options_vi, t.correct_index, t.explanation_vi, 1
  FROM materials m,
       (VALUES
         (0, 'multiple_choice'::text,
          'Chọn đáp án đúng:',
          'She ___ to school every day.',
          ARRAY['go', 'goes', 'going', 'gone'],
          ARRAY['go', 'goes', 'going', 'gone'],
          1, 'Chủ ngữ "she" là ngôi thứ ba số ít nên động từ thêm -es.'),
         (1, 'multiple_choice',
          'Chọn đáp án đúng:',
          'I ___ a movie last night.',
          ARRAY['watch', 'watched', 'watches', 'watching'],
          ARRAY['watch', 'watched', 'watches', 'watching'],
          1, '"Last night" là dấu hiệu của thì quá khứ đơn → "watched".'),
         (2, 'multiple_choice',
          'Chọn đáp án đúng:',
          'If I ___ rich, I would travel the world.',
          ARRAY['am', 'was', 'were', 'be'],
          ARRAY['am', 'was', 'were', 'be'],
          2, 'Câu điều kiện loại 2 dùng "were" cho mọi ngôi.'),
         (3, 'multiple_choice',
          'Chọn đáp án đúng:',
          'The book ___ by millions of people.',
          ARRAY['read', 'reads', 'is read', 'reading'],
          ARRAY['read', 'reads', 'is read', 'reading'],
          2, 'Câu bị động ở thì hiện tại đơn → "is read".'),
         (4, 'multiple_choice',
          'Chọn đáp án đúng:',
          'She said she ___ tired.',
          ARRAY['is', 'was', 'are', 'be'],
          ARRAY['is', 'was', 'are', 'be'],
          1, 'Câu tường thuật → lùi thì từ "is" thành "was".')
       ) AS t(idx, format, prompt_vi, prompt_en, options_en, options_vi,
              correct_index, explanation_vi)
  WHERE m.slug = 'test-thpt-grammar-a2'
  ON CONFLICT (material_id, idx) DO NOTHING;

  -- ============================================================
  -- Curated collection: "Thi tốt nghiệp THPT — Bộ luyện thi 30 ngày"
  -- ============================================================
  INSERT INTO material_collections (slug, title_vi, title_en, summary_vi, summary_en,
                                     goal, status, author_id, published_at)
  VALUES (
    'thi-thpt-30-ngay',
    'Thi tốt nghiệp THPT — Bộ luyện thi 30 ngày',
    'High-school graduation — 30-day prep collection',
    'Lộ trình 30 ngày ôn luyện ngữ pháp, từ vựng và đề thi mẫu cho kỳ thi tốt nghiệp THPT.',
    '30-day curriculum: grammar, vocabulary and sample tests for the high-school graduation exam.',
    'school',
    'published',
    v_admin_id,
    now()
  )
  ON CONFLICT (slug) DO NOTHING;

  -- Add a few materials to the collection
  INSERT INTO material_collection_items (collection_id, material_id, idx)
  SELECT c.id, m.id, ROW_NUMBER() OVER (ORDER BY m.created_at) - 1
  FROM material_collections c,
       materials m
  WHERE c.slug = 'thi-thpt-30-ngay'
    AND m.slug IN (
      'grammar-present-simple-a1',
      'grammar-past-simple-a2',
      'vocab-school-a2',
      'reading-hanoi-traffic-a2',
      'test-thpt-grammar-a2'
    )
  ON CONFLICT (collection_id, material_id) DO NOTHING;

  -- ============================================================
  -- Tag links (a few illustrative — production seeds would tag every row)
  -- ============================================================
  INSERT INTO material_tag_links (material_id, tag_id)
  SELECT m.id, t.id
  FROM materials m, material_tags t
  WHERE (m.slug = 'vocab-greetings-a1' AND t.slug IN ('greeting'))
     OR (m.slug = 'vocab-food-a1' AND t.slug IN ('food', 'vietnam', 'travel'))
     OR (m.slug = 'reading-tet-festival-b1' AND t.slug IN ('tet', 'vietnam'))
     OR (m.slug = 'test-thpt-grammar-a2' AND t.slug IN ('thpt', 'grammar'))
     OR (m.slug LIKE '%ielts%' AND t.slug = 'ielts')
     OR (m.slug LIKE '%toeic%' AND t.slug = 'toeic')
     OR (m.slug LIKE '%vstep%' AND t.slug = 'vstep')
  ON CONFLICT DO NOTHING;

END $$;
