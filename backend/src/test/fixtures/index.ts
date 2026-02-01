/**
 * Test Fixtures - Index
 * 
 * Central export point for all test fixtures
 */

export * from './users';
export * from './classes';
export * from './bookings';
export * from './gem-transactions';

import { allUsers } from './users';
import { classFixtures } from './classes';
import { bookingFixtures } from './bookings';
import { gemTransactionFixtures } from './gem-transactions';

/**
 * All fixtures combined for easy database seeding
 */
export const allFixtures = {
  profiles: allUsers,
  classes: classFixtures,
  bookings: bookingFixtures,
  gem_transactions: gemTransactionFixtures,
};

/**
 * Helper to get all fixtures as a flat array
 */
export function getAllFixturesFlat() {
  return {
    users: allUsers,
    classes: classFixtures,
    bookings: bookingFixtures,
    gemTransactions: gemTransactionFixtures,
  };
}
