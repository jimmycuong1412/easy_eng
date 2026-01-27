/**
 * Supabase Database Types
 * 
 * This file contains the TypeScript types for the Supabase database schema.
 * It will be auto-generated using `supabase gen types typescript` once the
 * database schema is set up.
 * 
 * For now, we define placeholder types that will be replaced.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      // =========================================================================
      // User Management
      // =========================================================================
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: 'student' | 'teacher' | 'parent' | 'admin';
          timezone: string;
          locale: string;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'student' | 'teacher' | 'parent' | 'admin';
          timezone?: string;
          locale?: string;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'student' | 'teacher' | 'parent' | 'admin';
          timezone?: string;
          locale?: string;
          currency?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =========================================================================
      // Cookie System
      // =========================================================================
      cookie_balances: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          lifetime_earned: number;
          lifetime_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          lifetime_earned?: number;
          lifetime_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          balance?: number;
          lifetime_earned?: number;
          lifetime_spent?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cookie_balances_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      cookie_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: 'earn' | 'spend' | 'refund' | 'expire' | 'admin_adjustment';
          source: string;
          reference_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: 'earn' | 'spend' | 'refund' | 'expire' | 'admin_adjustment';
          source: string;
          reference_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          amount?: number;
          type?: 'earn' | 'spend' | 'refund' | 'expire' | 'admin_adjustment';
          source?: string;
          reference_id?: string | null;
          description?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cookie_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      // =========================================================================
      // Career Avatar System
      // =========================================================================
      career_paths: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          icon_url: string | null;
          color_primary: string;
          color_secondary: string;
          max_level: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description: string;
          icon_url?: string | null;
          color_primary?: string;
          color_secondary?: string;
          max_level?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string;
          icon_url?: string | null;
          color_primary?: string;
          color_secondary?: string;
          max_level?: number;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };

      student_characters: {
        Row: {
          id: string;
          user_id: string;
          career_path_id: string;
          name: string;
          level: number;
          current_xp: number;
          total_xp: number;
          gold_balance: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          career_path_id: string;
          name: string;
          level?: number;
          current_xp?: number;
          total_xp?: number;
          gold_balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          career_path_id?: string;
          name?: string;
          level?: number;
          current_xp?: number;
          total_xp?: number;
          gold_balance?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'student_characters_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'student_characters_career_path_id_fkey';
            columns: ['career_path_id'];
            isOneToOne: false;
            referencedRelation: 'career_paths';
            referencedColumns: ['id'];
          }
        ];
      };

      // =========================================================================
      // Teachers & Classes
      // =========================================================================
      teacher_profiles: {
        Row: {
          id: string;
          user_id: string;
          bio: string | null;
          hourly_rate_cents: number;
          currency: string;
          languages: string[];
          specializations: string[];
          is_verified: boolean;
          is_accepting_students: boolean;
          avg_rating: number | null;
          total_reviews: number;
          total_classes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bio?: string | null;
          hourly_rate_cents: number;
          currency?: string;
          languages?: string[];
          specializations?: string[];
          is_verified?: boolean;
          is_accepting_students?: boolean;
          avg_rating?: number | null;
          total_reviews?: number;
          total_classes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          bio?: string | null;
          hourly_rate_cents?: number;
          currency?: string;
          languages?: string[];
          specializations?: string[];
          is_verified?: boolean;
          is_accepting_students?: boolean;
          avg_rating?: number | null;
          total_reviews?: number;
          total_classes?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      bookings: {
        Row: {
          id: string;
          student_id: string;
          teacher_id: string;
          scheduled_at: string;
          duration_minutes: number;
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          price_cents: number;
          cookies_applied: number;
          discount_cents: number;
          final_price_cents: number;
          currency: string;
          meeting_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          teacher_id: string;
          scheduled_at: string;
          duration_minutes?: number;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          price_cents: number;
          cookies_applied?: number;
          discount_cents?: number;
          final_price_cents: number;
          currency?: string;
          meeting_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          scheduled_at?: string;
          duration_minutes?: number;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          price_cents?: number;
          cookies_applied?: number;
          discount_cents?: number;
          final_price_cents?: number;
          meeting_url?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      // =========================================================================
      // Payments
      // =========================================================================
      payments: {
        Row: {
          id: string;
          user_id: string;
          booking_id: string | null;
          amount_cents: number;
          currency: string;
          provider: 'vnpay' | 'momo' | 'zalopay' | 'stripe';
          provider_payment_id: string | null;
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          booking_id?: string | null;
          amount_cents: number;
          currency?: string;
          provider: 'vnpay' | 'momo' | 'zalopay' | 'stripe';
          provider_payment_id?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          provider_payment_id?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
          metadata?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      // Cookie system functions
      add_cookies: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_source: string;
          p_reference_id?: string;
          p_description?: string;
        };
        Returns: number;
      };
      spend_cookies: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_source: string;
          p_reference_id?: string;
          p_description?: string;
        };
        Returns: boolean;
      };
      get_cookie_balance: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
      // XP system functions
      add_xp: {
        Args: {
          p_character_id: string;
          p_amount: number;
          p_source: string;
        };
        Returns: {
          new_level: number;
          new_xp: number;
          leveled_up: boolean;
        };
      };
    };
    Enums: {
      user_role: 'student' | 'teacher' | 'parent' | 'admin';
      booking_status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
      payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
      payment_provider: 'vnpay' | 'momo' | 'zalopay' | 'stripe';
      cookie_transaction_type: 'earn' | 'spend' | 'refund' | 'expire' | 'admin_adjustment';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

// Commonly used types
export type Profile = Tables<'profiles'>;
export type CookieBalance = Tables<'cookie_balances'>;
export type CookieTransaction = Tables<'cookie_transactions'>;
export type CareerPath = Tables<'career_paths'>;
export type StudentCharacter = Tables<'student_characters'>;
export type TeacherProfile = Tables<'teacher_profiles'>;
export type Booking = Tables<'bookings'>;
export type Payment = Tables<'payments'>;

export type UserRole = Enums<'user_role'>;
export type BookingStatus = Enums<'booking_status'>;
export type PaymentStatus = Enums<'payment_status'>;
export type PaymentProvider = Enums<'payment_provider'>;
