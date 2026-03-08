-- Seed Data for English Learning Platform
-- Purpose: Initialize gem earning rules and test data

-- =====================================================
-- Gem Earning Rules (if not already seeded in 044)
-- =====================================================

-- Insert initial gem earning rules (idempotent)
INSERT INTO gem_earning_rules (activity_type, gem_reward, is_active, rate_limit, conditions) VALUES
  ('lesson_completion', 50, TRUE, '{"max_per_day": 3}'::JSONB, NULL),
  ('attendance_streak', 100, TRUE, '{"max_per_week": 1}'::JSONB, '{"min_streak": 3}'::JSONB),
  ('referral', 200, TRUE, '{"max_per_month": 5}'::JSONB, NULL),
  ('profile_completion', 100, TRUE, NULL, NULL),
  ('first_review', 50, TRUE, NULL, NULL),
  ('daily_login', 10, TRUE, '{"max_per_day": 1}'::JSONB, NULL),
  ('quiz_completion', 30, TRUE, '{"max_per_day": 5}'::JSONB, NULL),
  ('manual_award', 0, TRUE, NULL, NULL) -- Admin sets amount manually
ON CONFLICT (activity_type) DO UPDATE SET
  gem_reward = EXCLUDED.gem_reward,
  is_active = EXCLUDED.is_active,
  rate_limit = EXCLUDED.rate_limit,
  conditions = EXCLUDED.conditions,
  updated_at = NOW();

-- =====================================================
-- Test Data (Development/Staging Only)
-- =====================================================

-- Note: This section should only run in development/staging environments
-- Production should use real user data

-- Uncomment below for development seeding

/*
-- Create test users (if not exists)
INSERT INTO auth.users (id, email) VALUES
  ('test-student-1', 'student1@test.com'),
  ('test-student-2', 'student2@test.com'),
  ('test-teacher-1', 'teacher1@test.com'),
  ('test-admin-1', 'admin1@test.com')
ON CONFLICT (id) DO NOTHING;

-- Create test profiles
INSERT INTO profiles (id, role, display_name, email) VALUES
  ('test-student-1', 'student', 'Test Student 1', 'student1@test.com'),
  ('test-student-2', 'student', 'Test Student 2', 'student2@test.com'),
  ('test-teacher-1', 'teacher', 'Test Teacher 1', 'teacher1@test.com'),
  ('test-admin-1', 'admin', 'Test Admin 1', 'admin1@test.com')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name;

-- Create test classes
INSERT INTO classes (id, teacher_id, title, description, price, max_students, scheduled_at, duration_minutes, status) VALUES
  ('test-class-1', 'test-teacher-1', 'Introduction to English Grammar', 'Learn the basics', 20.00, 5, NOW() + INTERVAL '1 day', 60, 'published'),
  ('test-class-2', 'test-teacher-1', 'Advanced Conversation', 'Practice speaking', 25.00, 4, NOW() + INTERVAL '2 days', 60, 'published')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  price = EXCLUDED.price;

-- Create test bookings
INSERT INTO bookings (student_id, class_id, payment_status, gems_used, final_price) VALUES
  ('test-student-1', 'test-class-1', 'confirmed', 0, 20.00),
  ('test-student-2', 'test-class-1', 'confirmed', 20, 10.00)
ON CONFLICT DO NOTHING;

-- Create test gem transactions
INSERT INTO gem_transactions (student_id, amount, transaction_type, reason) VALUES
  ('test-student-1', 100, 'earned', 'lesson_completion'),
  ('test-student-1', 50, 'earned', 'daily_login'),
  ('test-student-2', 200, 'earned', 'referral'),
  ('test-student-2', -20, 'spent', 'Class booking discount')
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- Career Paths (Task T142)
-- =====================================================

-- Insert 6 career paths for character progression
INSERT INTO career_paths (
  name, slug, description,
  base_health, base_mana, base_strength, base_intelligence, base_creativity, base_charisma,
  max_level, xp_multiplier, primary_color, secondary_color, sort_order
) VALUES
  (
    'Doctor',
    'doctor',
    'Heal others with medical knowledge and compassion. High intelligence and charisma.',
    120, 100, 8, 14, 10, 12,
    50, 1.00, '#E74C3C', '#ECF0F1', 1
  ),
  (
    'Engineer',
    'engineer',
    'Build and innovate with technical expertise. High intelligence and creativity.',
    100, 110, 10, 15, 13, 8,
    50, 1.05, '#3498DB', '#ECF0F1', 2
  ),
  (
    'Warrior',
    'warrior',
    'Fight with courage and strength. High health and strength.',
    150, 80, 16, 8, 9, 11,
    50, 0.95, '#C0392B', '#F39C12', 3
  ),
  (
    'Business Leader',
    'business',
    'Lead organizations with strategic thinking. High charisma and intelligence.',
    110, 90, 9, 12, 11, 15,
    50, 1.10, '#27AE60', '#ECF0F1', 4
  ),
  (
    'Artist',
    'artist',
    'Create beauty and express emotions. High creativity and charisma.',
    100, 120, 8, 11, 16, 13,
    50, 1.00, '#9B59B6', '#ECF0F1', 5
  ),
  (
    'Scientist',
    'scientist',
    'Discover truth through research and experimentation. High intelligence and creativity.',
    90, 130, 7, 17, 14, 9,
    50, 1.15, '#16A085', '#ECF0F1', 6
  )
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  base_health = EXCLUDED.base_health,
  base_mana = EXCLUDED.base_mana,
  base_strength = EXCLUDED.base_strength,
  base_intelligence = EXCLUDED.base_intelligence,
  base_creativity = EXCLUDED.base_creativity,
  base_charisma = EXCLUDED.base_charisma,
  xp_multiplier = EXCLUDED.xp_multiplier,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  updated_at = NOW();

-- =====================================================
-- Initial Activity Tracking Examples (Optional)
-- =====================================================

-- Uncomment to seed example activity tracking

/*
INSERT INTO activity_tracking (student_id, activity_type, activity_metadata, gems_awarded) VALUES
  ('test-student-1', 'lesson_completion', '{"booking_id": "test-class-1", "quiz_score": 85}'::JSONB, 50),
  ('test-student-1', 'daily_login', '{}'::JSONB, 10),
  ('test-student-2', 'referral', '{"referred_user_id": "test-student-1"}'::JSONB, 200)
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- Marketplace Items (T157 - Phase 10)
-- =====================================================

-- Insert marketplace items for character customization
-- Hats (50-200 Gold)
INSERT INTO marketplace_items (name, description, category, price_gold, sprite_url, career_compatibility, rarity, sort_order) VALUES
  ('Graduation Cap', 'Classic academic achievement symbol', 'hat', 75, 'character-sprites/hats/graduation-cap.png', '{"type": "all"}', 'common', 1),
  ('Medical Headband', 'Professional medical headwear', 'hat', 100, 'character-sprites/hats/medical-headband.png', '{"type": "specific", "careers": ["doctor"]}', 'uncommon', 2),
  ('Hard Hat', 'Safety first! Construction helmet', 'hat', 125, 'character-sprites/hats/hard-hat.png', '{"type": "specific", "careers": ["engineer"]}', 'uncommon', 3),
  ('Viking Helmet', 'Fearless warrior headgear', 'hat', 150, 'character-sprites/hats/viking-helmet.png', '{"type": "specific", "careers": ["warrior"]}', 'rare', 4),
  ('Top Hat', 'Executive elegance', 'hat', 175, 'character-sprites/hats/top-hat.png', '{"type": "specific", "careers": ["business"]}', 'rare', 5),
  ('Beret', 'Artistic inspiration', 'hat', 100, 'character-sprites/hats/beret.png', '{"type": "specific", "careers": ["artist"]}', 'uncommon', 6),
  ('Lab Goggles', 'Science safety gear', 'hat', 125, 'character-sprites/hats/lab-goggles.png', '{"type": "specific", "careers": ["scientist"]}', 'uncommon', 7),
  ('Crown', 'Legendary achievement', 'hat', 200, 'character-sprites/hats/crown.png', '{"type": "all"}', 'legendary', 8)
ON CONFLICT DO NOTHING;

-- Outfits (100-500 Gold)
INSERT INTO marketplace_items (name, description, category, price_gold, sprite_url, career_compatibility, rarity, sort_order) VALUES
  ('Casual T-Shirt', 'Comfortable everyday wear', 'outfit', 100, 'character-sprites/outfits/casual-tshirt.png', '{"type": "all"}', 'common', 10),
  ('Doctor Scrubs', 'Professional medical attire', 'outfit', 250, 'character-sprites/outfits/doctor-scrubs.png', '{"type": "specific", "careers": ["doctor"]}', 'uncommon', 11),
  ('Engineer Vest', 'High-visibility work vest', 'outfit', 200, 'character-sprites/outfits/engineer-vest.png', '{"type": "specific", "careers": ["engineer"]}', 'uncommon', 12),
  ('Warrior Armor', 'Battle-ready protection', 'outfit', 400, 'character-sprites/outfits/warrior-armor.png', '{"type": "specific", "careers": ["warrior"]}', 'epic', 13),
  ('Business Suit', 'Executive power suit', 'outfit', 350, 'character-sprites/outfits/business-suit.png', '{"type": "specific", "careers": ["business"]}', 'rare', 14),
  ('Artist Smock', 'Paint-splattered creativity', 'outfit', 150, 'character-sprites/outfits/artist-smock.png', '{"type": "specific", "careers": ["artist"]}', 'common', 15),
  ('Lab Coat', 'Pristine laboratory attire', 'outfit', 225, 'character-sprites/outfits/lab-coat.png', '{"type": "specific", "careers": ["scientist"]}', 'uncommon', 16),
  ('Superhero Cape', 'Ultimate achievement outfit', 'outfit', 500, 'character-sprites/outfits/superhero-cape.png', '{"type": "all"}', 'legendary', 17)
ON CONFLICT DO NOTHING;

-- Backgrounds (150 Gold)
INSERT INTO marketplace_items (name, description, category, price_gold, sprite_url, career_compatibility, rarity, sort_order) VALUES
  ('Classroom', 'Traditional learning environment', 'background', 150, 'character-sprites/backgrounds/classroom.png', '{"type": "all"}', 'common', 20),
  ('Hospital', 'Medical facility setting', 'background', 150, 'character-sprites/backgrounds/hospital.png', '{"type": "specific", "careers": ["doctor"]}', 'common', 21),
  ('Workshop', 'Industrial workspace', 'background', 150, 'character-sprites/backgrounds/workshop.png', '{"type": "specific", "careers": ["engineer"]}', 'common', 22),
  ('Battle Arena', 'Combat training ground', 'background', 150, 'character-sprites/backgrounds/arena.png', '{"type": "specific", "careers": ["warrior"]}', 'common', 23),
  ('Office Tower', 'Corporate headquarters', 'background', 150, 'character-sprites/backgrounds/office.png', '{"type": "specific", "careers": ["business"]}', 'common', 24),
  ('Art Studio', 'Creative workspace', 'background', 150, 'character-sprites/backgrounds/studio.png', '{"type": "specific", "careers": ["artist"]}', 'common', 25),
  ('Laboratory', 'Research facility', 'background', 150, 'character-sprites/backgrounds/laboratory.png', '{"type": "specific", "careers": ["scientist"]}', 'common', 26),
  ('Space Station', 'Futuristic achievement', 'background', 150, 'character-sprites/backgrounds/space-station.png', '{"type": "all"}', 'rare', 27)
ON CONFLICT DO NOTHING;

-- Emotes (75 Gold)
INSERT INTO marketplace_items (name, description, category, price_gold, sprite_url, career_compatibility, rarity, sort_order) VALUES
  ('Happy Wave', 'Friendly greeting animation', 'emote', 75, 'character-sprites/emotes/wave.png', '{"type": "all"}', 'common', 30),
  ('Victory Dance', 'Celebrate your wins!', 'emote', 75, 'character-sprites/emotes/victory-dance.png', '{"type": "all"}', 'common', 31),
  ('Thinking Pose', 'Deep concentration', 'emote', 75, 'character-sprites/emotes/thinking.png', '{"type": "all"}', 'common', 32),
  ('Heart Gesture', 'Healing energy', 'emote', 75, 'character-sprites/emotes/heart.png', '{"type": "specific", "careers": ["doctor"]}', 'uncommon', 33),
  ('Build Animation', 'Constructing something great', 'emote', 75, 'character-sprites/emotes/build.png', '{"type": "specific", "careers": ["engineer"]}', 'uncommon', 34),
  ('Battle Stance', 'Ready for combat', 'emote', 75, 'character-sprites/emotes/battle-stance.png', '{"type": "specific", "careers": ["warrior"]}', 'uncommon', 35),
  ('Handshake Deal', 'Seal the agreement', 'emote', 75, 'character-sprites/emotes/handshake.png', '{"type": "specific", "careers": ["business"]}', 'uncommon', 36),
  ('Paint Brush', 'Creating art', 'emote', 75, 'character-sprites/emotes/paint.png', '{"type": "specific", "careers": ["artist"]}', 'uncommon', 37),
  ('Eureka Moment', 'Scientific discovery!', 'emote', 75, 'character-sprites/emotes/eureka.png', '{"type": "specific", "careers": ["scientist"]}', 'uncommon', 38)
ON CONFLICT DO NOTHING;

-- Pets (300 Gold)
INSERT INTO marketplace_items (name, description, category, price_gold, sprite_url, career_compatibility, rarity, sort_order) VALUES
  ('Study Buddy Cat', 'Purring companion for learning', 'pet', 300, 'character-sprites/pets/cat.png', '{"type": "all"}', 'rare', 40),
  ('Medical Service Dog', 'Loyal therapy companion', 'pet', 300, 'character-sprites/pets/service-dog.png', '{"type": "specific", "careers": ["doctor"]}', 'rare', 41),
  ('Robot Assistant', 'Automated helper bot', 'pet', 300, 'character-sprites/pets/robot.png', '{"type": "specific", "careers": ["engineer"]}', 'rare', 42),
  ('Battle Wolf', 'Fierce warrior companion', 'pet', 300, 'character-sprites/pets/wolf.png', '{"type": "specific", "careers": ["warrior"]}', 'rare', 43),
  ('Business Parrot', 'Repeats your best pitches', 'pet', 300, 'character-sprites/pets/parrot.png', '{"type": "specific", "careers": ["business"]}', 'rare', 44),
  ('Muse Owl', 'Inspiration on wings', 'pet', 300, 'character-sprites/pets/owl.png', '{"type": "specific", "careers": ["artist"]}', 'rare', 45),
  ('Lab Mouse', 'Experimental assistant', 'pet', 300, 'character-sprites/pets/mouse.png', '{"type": "specific", "careers": ["scientist"]}', 'rare', 46),
  ('Phoenix', 'Ultimate legendary pet', 'pet', 300, 'character-sprites/pets/phoenix.png', '{"type": "all"}', 'legendary', 47)
ON CONFLICT DO NOTHING;

-- =====================================================
-- End of Seed Data
-- =====================================================

-- Log seeding completion
DO $$
BEGIN
  RAISE NOTICE 'Seed data applied successfully';
  RAISE NOTICE 'Gem earning rules: % active rules', (SELECT COUNT(*) FROM gem_earning_rules WHERE is_active = TRUE);
  RAISE NOTICE 'Career paths: % available careers', (SELECT COUNT(*) FROM career_paths WHERE is_active = TRUE);
  RAISE NOTICE 'Marketplace items: % items available', (SELECT COUNT(*) FROM marketplace_items WHERE is_active = TRUE);
END $$;
