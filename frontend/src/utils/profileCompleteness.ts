/**
 * Profile Completeness Utilities
 * Calculates profile completion percentage and tracks missing fields
 * Used to award one-time 100 gem bonus when profile reaches 100%
 */

export interface ProfileData {
  display_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  timezone?: string | null;
  language_preference?: string | null;
  learning_goals?: string[] | null;
  interests?: string[] | null;
  // Add other profile fields as needed
}

export interface ProfileCompletenessResult {
  percentage: number;
  isComplete: boolean;
  completedFields: string[];
  missingFields: string[];
  fieldWeights: Record<string, number>;
  totalWeight: number;
  completedWeight: number;
}

// Field weights (importance for completion)
const FIELD_WEIGHTS: Record<string, number> = {
  display_name: 20, // Required
  email: 15, // Required (usually auto-filled)
  avatar_url: 15,
  bio: 10,
  phone: 10,
  timezone: 10,
  language_preference: 10,
  learning_goals: 5,
  interests: 5,
};

// Minimum required fields (must be filled for any completion)
const REQUIRED_FIELDS = ['display_name', 'email'];

/**
 * Checks if a field value is considered "complete"
 */
function isFieldComplete(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Calculates profile completion percentage and returns detailed breakdown
 */
export function calculateProfileCompleteness(
  profile: ProfileData
): ProfileCompletenessResult {
  const completedFields: string[] = [];
  const missingFields: string[] = [];
  let completedWeight = 0;
  const totalWeight = Object.values(FIELD_WEIGHTS).reduce((sum, w) => sum + w, 0);

  // Check each field
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const value = profile[field as keyof ProfileData];

    if (isFieldComplete(value)) {
      completedFields.push(field);
      completedWeight += weight;
    } else {
      missingFields.push(field);
    }
  }

  // Calculate percentage
  const percentage = Math.round((completedWeight / totalWeight) * 100);

  // Profile is only "complete" if percentage is 100% AND all required fields are filled
  const allRequiredFieldsComplete = REQUIRED_FIELDS.every((field) =>
    completedFields.includes(field)
  );
  const isComplete = percentage === 100 && allRequiredFieldsComplete;

  return {
    percentage,
    isComplete,
    completedFields,
    missingFields,
    fieldWeights: FIELD_WEIGHTS,
    totalWeight,
    completedWeight,
  };
}

/**
 * Returns human-readable field names
 */
export function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    display_name: 'Display Name',
    email: 'Email Address',
    avatar_url: 'Profile Picture',
    bio: 'Bio / About Me',
    phone: 'Phone Number',
    timezone: 'Timezone',
    language_preference: 'Preferred Language',
    learning_goals: 'Learning Goals',
    interests: 'Interests',
  };

  return labels[fieldName] || fieldName;
}

/**
 * Returns completion status with user-friendly message
 */
export function getCompletenessMessage(result: ProfileCompletenessResult): string {
  if (result.isComplete) {
    return 'Your profile is 100% complete! You earned 100 gems!';
  }

  if (result.percentage >= 80) {
    return `Almost there! Complete ${result.missingFields.length} more field${
      result.missingFields.length === 1 ? '' : 's'
    } to earn 100 gems.`;
  }

  if (result.percentage >= 50) {
    return `You're halfway there! Complete your profile to earn 100 gems.`;
  }

  return `Complete your profile to earn 100 gems (${result.percentage}% done).`;
}

/**
 * Returns the next most important missing field to complete
 */
export function getNextFieldToComplete(result: ProfileCompletenessResult): {
  field: string;
  label: string;
  weight: number;
} | null {
  if (result.isComplete) return null;

  // Sort missing fields by weight (descending)
  const sortedMissing = result.missingFields.sort(
    (a, b) => result.fieldWeights[b] - result.fieldWeights[a]
  );

  const nextField = sortedMissing[0];
  if (!nextField) return null;

  return {
    field: nextField,
    label: getFieldLabel(nextField),
    weight: result.fieldWeights[nextField],
  };
}

/**
 * Checks if profile just became complete (compare old vs new)
 * Used to trigger gem award
 */
export function didProfileBecomeComplete(
  oldProfile: ProfileData,
  newProfile: ProfileData
): boolean {
  const oldResult = calculateProfileCompleteness(oldProfile);
  const newResult = calculateProfileCompleteness(newProfile);

  // Profile became complete if it wasn't before, but is now
  return !oldResult.isComplete && newResult.isComplete;
}

/**
 * Example usage:
 *
 * const profile = {
 *   display_name: "John Doe",
 *   email: "john@example.com",
 *   avatar_url: "https://...",
 *   bio: "I love learning English!",
 *   // ... other fields
 * };
 *
 * const result = calculateProfileCompleteness(profile);
 * console.log(`Profile is ${result.percentage}% complete`);
 * console.log(`Missing fields: ${result.missingFields.map(getFieldLabel).join(', ')}`);
 *
 * if (result.isComplete) {
 *   // Award 100 gems!
 *   await awardProfileCompletionGems(userId);
 * }
 */
