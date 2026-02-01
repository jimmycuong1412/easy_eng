/**
 * Shared TypeScript Types
 * Used across both frontend and backend services
 */

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export type ClassLevel = 'beginner' | 'intermediate' | 'advanced';

export type ClassStatus = 'draft' | 'published' | 'archived';

export type GemTransactionType = 'earned' | 'spent' | 'refunded' | 'adjusted';

export type Currency = 'USD' | 'VND';

/**
 * User Profile
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  timezone: string;
  locale: string;
  created_at: string;
  updated_at: string;
}

/**
 * Class
 */
export interface Class {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  level: ClassLevel;
  price: number;
  currency: Currency;
  duration_minutes: number;
  capacity: number;
  timezone: string;
  status: ClassStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Booking
 */
export interface Booking {
  id: string;
  student_id: string;
  class_id: string;
  gems_used: number;
  discount_amount: number;
  final_price: number;
  payment_status: PaymentStatus;
  booking_status: BookingStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Gem Transaction
 */
export interface GemTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: GemTransactionType;
  reason: string;
  reference_id: string | null;
  created_at: string;
}

/**
 * API Response Wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination Metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

/**
 * Error Response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
  statusCode?: number;
}
