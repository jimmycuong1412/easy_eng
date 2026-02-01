/**
 * Test Fixtures - User Profiles
 * 
 * Mock user data for testing different user roles and scenarios
 */

export const userFixtures = {
  student: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'student@test.com',
    full_name: 'Test Student',
    role: 'student',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
  },
  teacher: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'teacher@test.com',
    full_name: 'Test Teacher',
    role: 'teacher',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
  },
  parent: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'parent@test.com',
    full_name: 'Test Parent',
    role: 'parent',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
  },
  admin: {
    id: '550e8400-e29b-41d4-a716-446655440004',
    email: 'admin@test.com',
    full_name: 'Test Admin',
    role: 'admin',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
  },
};

export const allUsers = Object.values(userFixtures);
