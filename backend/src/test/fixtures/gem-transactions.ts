/**
 * Test Fixtures - Gem Transactions
 * 
 * Mock gem transaction data for testing virtual currency scenarios
 */

export const gemTransactionFixtures = [
  {
    id: '850e8400-e29b-41d4-a716-446655440001',
    user_id: '550e8400-e29b-41d4-a716-446655440001', // Test student
    amount: 100,
    transaction_type: 'earned',
    reason: 'referral_bonus',
    reference_id: null,
    created_at: new Date('2024-01-10').toISOString(),
  },
  {
    id: '850e8400-e29b-41d4-a716-446655440002',
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    amount: 20,
    transaction_type: 'earned',
    reason: 'first_booking',
    reference_id: null,
    created_at: new Date('2024-01-15').toISOString(),
  },
  {
    id: '850e8400-e29b-41d4-a716-446655440003',
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    amount: -20,
    transaction_type: 'spent',
    reason: 'class_booking',
    reference_id: '750e8400-e29b-41d4-a716-446655440002', // Booking ID
    created_at: new Date('2024-02-05').toISOString(),
  },
  {
    id: '850e8400-e29b-41d4-a716-446655440004',
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    amount: 10,
    transaction_type: 'earned',
    reason: 'class_completion',
    reference_id: '750e8400-e29b-41d4-a716-446655440001',
    created_at: new Date('2024-02-02').toISOString(),
  },
];

/**
 * Calculate total gem balance from transactions
 */
export function calculateGemBalance(userId: string): number {
  return gemTransactionFixtures
    .filter((t) => t.user_id === userId)
    .reduce((sum, t) => sum + t.amount, 0);
}
