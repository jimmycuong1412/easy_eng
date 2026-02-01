/**
 * Test Fixtures - Classes
 * 
 * Mock class data for testing booking and scheduling scenarios
 */

export const classFixtures = [
  {
    id: '650e8400-e29b-41d4-a716-446655440001',
    teacher_id: '550e8400-e29b-41d4-a716-446655440002', // Test teacher
    title: 'Beginner English Conversation',
    description: 'Learn basic English conversation skills',
    level: 'beginner',
    price: 50.0,
    currency: 'USD',
    duration_minutes: 60,
    capacity: 10,
    timezone: 'America/New_York',
    status: 'published',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString(),
  },
  {
    id: '650e8400-e29b-41d4-a716-446655440002',
    teacher_id: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Advanced Business English',
    description: 'Professional English for business contexts',
    level: 'advanced',
    price: 100.0,
    currency: 'USD',
    duration_minutes: 90,
    capacity: 5,
    timezone: 'America/New_York',
    status: 'published',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString(),
  },
  {
    id: '650e8400-e29b-41d4-a716-446655440003',
    teacher_id: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Intermediate Grammar Workshop',
    description: 'Master English grammar at intermediate level',
    level: 'intermediate',
    price: 75.0,
    currency: 'USD',
    duration_minutes: 120,
    capacity: 8,
    timezone: 'America/New_York',
    status: 'draft',
    created_at: new Date('2024-01-20').toISOString(),
    updated_at: new Date('2024-01-20').toISOString(),
  },
];
