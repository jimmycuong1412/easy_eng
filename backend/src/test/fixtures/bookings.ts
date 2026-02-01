/**
 * Test Fixtures - Bookings
 * 
 * Mock booking data for testing payment and booking scenarios
 */

export const bookingFixtures = [
  {
    id: '750e8400-e29b-41d4-a716-446655440001',
    student_id: '550e8400-e29b-41d4-a716-446655440001', // Test student
    class_id: '650e8400-e29b-41d4-a716-446655440001', // Beginner class
    gems_used: 0,
    discount_amount: 0,
    final_price: 50.0,
    payment_status: 'completed',
    booking_status: 'confirmed',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-02-01').toISOString(),
  },
  {
    id: '750e8400-e29b-41d4-a716-446655440002',
    student_id: '550e8400-e29b-41d4-a716-446655440001',
    class_id: '650e8400-e29b-41d4-a716-446655440002', // Advanced class
    gems_used: 20,
    discount_amount: 10.0,
    final_price: 90.0,
    payment_status: 'pending',
    booking_status: 'pending',
    created_at: new Date('2024-02-05').toISOString(),
    updated_at: new Date('2024-02-05').toISOString(),
  },
];
