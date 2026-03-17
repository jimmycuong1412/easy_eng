/**
 * Supabase Database Types
 *
 * Generated from migration files in supabase/migrations/.
 * Provides full type safety for all 32+ tables.
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
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          timezone: string;
          locale: string;
          /** User's preferred display currency. One of: 'VND', 'USD', 'EUR'. */
          currency: string;
          phone: string | null;
          date_of_birth: string | null;
          bio: string | null;
          is_active: boolean;
          email_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          timezone?: string;
          locale?: string;
          currency?: string;
          phone?: string | null;
          date_of_birth?: string | null;
          bio?: string | null;
          is_active?: boolean;
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          timezone?: string;
          locale?: string;
          currency?: string;
          phone?: string | null;
          date_of_birth?: string | null;
          bio?: string | null;
          is_active?: boolean;
          email_verified?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          teacher_id: string;
          title: string;
          description: string | null;
          level: ClassLevel;
          price: number;
          currency: string;
          schedule_type: ScheduleType;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          timezone: string;
          max_students: number;
          current_enrollments: number;
          status: ClassStatus;
          materials_url: string | null;
          meeting_link: string | null;
          tags: string[] | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          title: string;
          description?: string | null;
          level: ClassLevel;
          price: number;
          currency?: string;
          schedule_type: ScheduleType;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          timezone?: string;
          max_students?: number;
          current_enrollments?: number;
          status?: ClassStatus;
          materials_url?: string | null;
          meeting_link?: string | null;
          tags?: string[] | null;
          is_active?: boolean;
        };
        Update: {
          teacher_id?: string;
          title?: string;
          description?: string | null;
          level?: ClassLevel;
          price?: number;
          currency?: string;
          schedule_type?: ScheduleType;
          start_time?: string;
          end_time?: string;
          duration_minutes?: number;
          timezone?: string;
          max_students?: number;
          current_enrollments?: number;
          status?: ClassStatus;
          materials_url?: string | null;
          meeting_link?: string | null;
          tags?: string[] | null;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'classes_teacher_id_fkey';
            columns: ['teacher_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          class_id: string;
          original_price: number;
          gems_used: number;
          gems_discount_amount: number;
          final_price: number;
          currency: string;
          payment_status: PaymentStatus;
          payment_intent_id: string | null;
          paid_at: string | null;
          status: BookingStatus;
          booking_notes: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          completed_at: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          class_id: string;
          original_price: number;
          gems_used?: number;
          gems_discount_amount?: number;
          final_price: number;
          currency?: string;
          payment_status?: PaymentStatus;
          payment_intent_id?: string | null;
          status?: BookingStatus;
          booking_notes?: string | null;
          idempotency_key?: string | null;
        };
        Update: {
          payment_status?: PaymentStatus;
          payment_intent_id?: string | null;
          paid_at?: string | null;
          status?: BookingStatus;
          booking_notes?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_class_id_fkey';
            columns: ['class_id'];
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
        ];
      };
      gem_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          transaction_type: GemTransactionType;
          booking_id: string | null;
          class_id: string | null;
          description: string | null;
          metadata: Json;
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          transaction_type: GemTransactionType;
          booking_id?: string | null;
          class_id?: string | null;
          description?: string | null;
          metadata?: Json;
          granted_by?: string | null;
        };
        Update: {
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'gem_transactions_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gem_transactions_booking_id_fkey';
            columns: ['booking_id'];
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          transaction_id: string;
          amount: number;
          currency: string;
          payment_method: PaymentProvider;
          status: PaymentStatus;
          payment_url: string | null;
          gateway_response: Json | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          transaction_id: string;
          amount: number;
          currency?: string;
          payment_method: PaymentProvider;
          status?: PaymentStatus;
          payment_url?: string | null;
          gateway_response?: Json | null;
          metadata?: Json;
        };
        Update: {
          status?: PaymentStatus;
          gateway_response?: Json | null;
          metadata?: Json;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          student_id: string;
          class_id: string;
          teacher_id: string;
          rating: number;
          comment: string | null;
          is_anonymous: boolean;
          is_flagged: boolean;
          flagged_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          student_id: string;
          class_id: string;
          teacher_id: string;
          rating: number;
          comment?: string | null;
          is_anonymous?: boolean;
        };
        Update: {
          comment?: string | null;
          is_flagged?: boolean;
          flagged_reason?: string | null;
        };
        Relationships: [];
      };
      teacher_availability: {
        Row: {
          id: string;
          teacher_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active?: boolean;
        };
        Update: {
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_availability_teacher_id_fkey';
            columns: ['teacher_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      teacher_availability_exceptions: {
        Row: {
          id: string;
          teacher_id: string;
          exception_date: string;
          start_time: string | null;
          end_time: string | null;
          is_available: boolean;
          reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          exception_date: string;
          start_time?: string | null;
          end_time?: string | null;
          is_available?: boolean;
          reason?: string | null;
        };
        Update: {
          exception_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          is_available?: boolean;
          reason?: string | null;
        };
        Relationships: [];
      };
      class_sessions: {
        Row: {
          id: string;
          class_id: string;
          teacher_id: string;
          cometchat_group_id: string;
          cometchat_session_id: string | null;
          status: SessionStatus;
          scheduled_start_time: string;
          actual_start_time: string | null;
          end_time: string | null;
          duration_minutes: number | null;
          max_participants: number;
          current_participants: number;
          recording_url: string | null;
          recording_enabled: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          teacher_id: string;
          cometchat_group_id: string;
          cometchat_session_id?: string | null;
          status?: SessionStatus;
          scheduled_start_time: string;
          max_participants?: number;
          recording_enabled?: boolean;
          metadata?: Json;
        };
        Update: {
          cometchat_session_id?: string | null;
          status?: SessionStatus;
          actual_start_time?: string | null;
          end_time?: string | null;
          duration_minutes?: number | null;
          current_participants?: number;
          recording_url?: string | null;
          recording_enabled?: boolean;
          metadata?: Json;
        };
        Relationships: [];
      };
      session_participants: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          booking_id: string | null;
          role: string;
          joined_at: string | null;
          left_at: string | null;
          duration_seconds: number;
          is_present: boolean;
          messages_sent: number;
          reactions_count: number;
          screen_shares_count: number;
          avg_connection_quality: string | null;
          disconnection_count: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          booking_id?: string | null;
          role: string;
          joined_at?: string | null;
          metadata?: Json;
        };
        Update: {
          left_at?: string | null;
          duration_seconds?: number;
          is_present?: boolean;
          messages_sent?: number;
          reactions_count?: number;
          screen_shares_count?: number;
          avg_connection_quality?: string | null;
          disconnection_count?: number;
          metadata?: Json;
        };
        Relationships: [];
      };
      session_events: {
        Row: {
          id: string;
          session_id: string;
          user_id: string | null;
          event_type: string;
          event_data: Json;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id?: string | null;
          event_type: string;
          event_data?: Json;
          occurred_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          action_url: string | null;
          action_label: string | null;
          read: boolean;
          read_at: string | null;
          related_id: string | null;
          related_type: string | null;
          metadata: Json;
          icon: string | null;
          color: string | null;
          priority: NotificationPriority;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          action_url?: string | null;
          action_label?: string | null;
          related_id?: string | null;
          related_type?: string | null;
          metadata?: Json;
          icon?: string | null;
          color?: string | null;
          priority?: NotificationPriority;
          expires_at?: string | null;
        };
        Update: {
          read?: boolean;
          read_at?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      quizzes: {
        Row: {
          id: string;
          teacher_id: string;
          class_id: string | null;
          title: string;
          description: string | null;
          instructions: string | null;
          difficulty: QuizDifficulty | null;
          time_limit_minutes: number | null;
          passing_score: number;
          max_attempts: number;
          shuffle_questions: boolean;
          show_correct_answers: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          class_id?: string | null;
          title: string;
          description?: string | null;
          instructions?: string | null;
          difficulty?: QuizDifficulty | null;
          time_limit_minutes?: number | null;
          passing_score?: number;
          max_attempts?: number;
          shuffle_questions?: boolean;
          show_correct_answers?: boolean;
          is_active?: boolean;
        };
        Update: {
          title?: string;
          description?: string | null;
          instructions?: string | null;
          difficulty?: QuizDifficulty | null;
          time_limit_minutes?: number | null;
          passing_score?: number;
          max_attempts?: number;
          shuffle_questions?: boolean;
          show_correct_answers?: boolean;
          is_active?: boolean;
        };
        Relationships: [];
      };
      quiz_questions: {
        Row: {
          id: string;
          quiz_id: string;
          question_text: string;
          question_type: QuestionType;
          options: Json | null;
          correct_answer: string;
          explanation: string | null;
          points: number;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          question_text: string;
          question_type: QuestionType;
          options?: Json | null;
          correct_answer: string;
          explanation?: string | null;
          points?: number;
          order_index?: number;
        };
        Update: {
          question_text?: string;
          question_type?: QuestionType;
          options?: Json | null;
          correct_answer?: string;
          explanation?: string | null;
          points?: number;
          order_index?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'quiz_questions_quiz_id_fkey';
            columns: ['quiz_id'];
            referencedRelation: 'quizzes';
            referencedColumns: ['id'];
          },
        ];
      };
      quiz_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          student_id: string;
          answers: Json;
          score: number;
          total_points: number;
          earned_points: number;
          passed: boolean;
          gems_awarded: number;
          started_at: string;
          completed_at: string | null;
          time_taken_seconds: number | null;
          attempt_number: number;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          student_id: string;
          answers: Json;
          score: number;
          total_points: number;
          earned_points: number;
          passed: boolean;
          gems_awarded?: number;
          time_taken_seconds?: number | null;
          attempt_number?: number;
        };
        Update: {
          completed_at?: string | null;
          time_taken_seconds?: number | null;
        };
        Relationships: [];
      };
      teacher_earnings: {
        Row: {
          id: string;
          teacher_id: string;
          booking_id: string;
          class_id: string;
          session_id: string | null;
          student_id: string;
          class_price: number;
          gems_discount: number;
          final_price: number;
          teacher_share: number;
          platform_fee: number;
          status: EarningStatus;
          payout_request_id: string | null;
          paid_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
          earned_at: string | null;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          booking_id: string;
          class_id: string;
          session_id?: string | null;
          student_id: string;
          class_price: number;
          gems_discount?: number;
          final_price: number;
          teacher_share: number;
          platform_fee: number;
          status?: EarningStatus;
          metadata?: Json;
        };
        Update: {
          status?: EarningStatus;
          payout_request_id?: string | null;
          paid_at?: string | null;
          earned_at?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      payout_requests: {
        Row: {
          id: string;
          teacher_id: string;
          amount: number;
          currency: string;
          payment_method: PayoutMethod;
          payment_details: Json;
          status: PayoutStatus;
          admin_notes: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
          reviewed_at: string | null;
          processed_at: string | null;
          completed_at: string | null;
          reviewed_by: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          amount: number;
          currency?: string;
          payment_method: PayoutMethod;
          payment_details: Json;
          status?: PayoutStatus;
          metadata?: Json;
        };
        Update: {
          status?: PayoutStatus;
          admin_notes?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          processed_at?: string | null;
          completed_at?: string | null;
          reviewed_by?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      cancellation_policies: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          rules: Json;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          rules?: Json;
          is_default?: boolean;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          description?: string | null;
          rules?: Json;
          is_default?: boolean;
          is_active?: boolean;
        };
        Relationships: [];
      };
      cancellation_logs: {
        Row: {
          id: string;
          booking_id: string;
          class_id: string;
          student_id: string;
          teacher_id: string;
          cancelled_by: string;
          cancelled_by_role: string;
          class_scheduled_at: string;
          cancelled_at: string;
          hours_before_class: number | null;
          original_price: number;
          gems_used: number;
          refund_percentage: number;
          gems_refunded: number;
          cash_refunded: number;
          policy_id: string | null;
          policy_name: string | null;
          reason: string | null;
          notes: string | null;
          refund_status: RefundStatus;
          created_at: string;
          refund_processed_at: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          class_id: string;
          student_id: string;
          teacher_id: string;
          cancelled_by: string;
          cancelled_by_role: string;
          class_scheduled_at: string;
          original_price: number;
          gems_used?: number;
          refund_percentage: number;
          gems_refunded?: number;
          cash_refunded?: number;
          policy_id?: string | null;
          policy_name?: string | null;
          reason?: string | null;
          notes?: string | null;
        };
        Update: {
          refund_status?: RefundStatus;
          refund_processed_at?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      career_paths: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          icon_url: string | null;
          base_health: number;
          base_mana: number;
          base_strength: number;
          base_intelligence: number;
          base_creativity: number;
          base_charisma: number;
          max_level: number;
          xp_multiplier: number;
          primary_color: string;
          secondary_color: string;
          sprite_base_url: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description: string;
          icon_url?: string | null;
          base_health?: number;
          base_mana?: number;
          base_strength?: number;
          base_intelligence?: number;
          base_creativity?: number;
          base_charisma?: number;
          max_level?: number;
          xp_multiplier?: number;
          primary_color?: string;
          secondary_color?: string;
          sprite_base_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string;
          icon_url?: string | null;
          base_health?: number;
          base_mana?: number;
          base_strength?: number;
          base_intelligence?: number;
          base_creativity?: number;
          base_charisma?: number;
          max_level?: number;
          xp_multiplier?: number;
          primary_color?: string;
          secondary_color?: string;
          sprite_base_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      student_careers: {
        Row: {
          id: string;
          student_id: string;
          career_path_id: string;
          current_level: number;
          current_xp: number;
          xp_to_next_level: number;
          health: number;
          mana: number;
          strength: number;
          intelligence: number;
          creativity: number;
          charisma: number;
          character_name: string | null;
          current_sprite_url: string | null;
          total_xp_earned: number;
          total_levels_gained: number;
          last_level_up_at: string | null;
          is_active: boolean;
          selected_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          career_path_id: string;
          character_name?: string | null;
          current_sprite_url?: string | null;
        };
        Update: {
          current_level?: number;
          current_xp?: number;
          xp_to_next_level?: number;
          health?: number;
          mana?: number;
          strength?: number;
          intelligence?: number;
          creativity?: number;
          charisma?: number;
          character_name?: string | null;
          current_sprite_url?: string | null;
          total_xp_earned?: number;
          total_levels_gained?: number;
          last_level_up_at?: string | null;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'student_careers_career_path_id_fkey';
            columns: ['career_path_id'];
            referencedRelation: 'career_paths';
            referencedColumns: ['id'];
          },
        ];
      };
      xp_transactions: {
        Row: {
          id: string;
          student_id: string;
          career_id: string | null;
          xp_amount: number;
          activity_type: string;
          activity_description: string | null;
          activity_metadata: Json | null;
          level_before: number;
          level_after: number;
          caused_level_up: boolean;
          source: string;
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          career_id?: string | null;
          xp_amount: number;
          activity_type: string;
          activity_description?: string | null;
          activity_metadata?: Json | null;
          level_before: number;
          level_after: number;
          caused_level_up?: boolean;
          source?: string;
          granted_by?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      xp_earning_rules: {
        Row: {
          id: string;
          activity_type: string;
          xp_reward: number;
          description: string | null;
          is_active: boolean;
          rate_limit: Json | null;
          conditions: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          activity_type: string;
          xp_reward: number;
          description?: string | null;
          is_active?: boolean;
          rate_limit?: Json | null;
          conditions?: Json | null;
        };
        Update: {
          xp_reward?: number;
          description?: string | null;
          is_active?: boolean;
          rate_limit?: Json | null;
          conditions?: Json | null;
        };
        Relationships: [];
      };
      character_sprites: {
        Row: {
          id: string;
          career_id: string;
          level_range_min: number;
          level_range_max: number;
          sprite_url: string;
          animation_data: Json;
          color_palette: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          career_id: string;
          level_range_min: number;
          level_range_max: number;
          sprite_url: string;
          animation_data?: Json;
          color_palette?: Json;
        };
        Update: {
          sprite_url?: string;
          animation_data?: Json;
          color_palette?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'character_sprites_career_id_fkey';
            columns: ['career_id'];
            referencedRelation: 'career_paths';
            referencedColumns: ['id'];
          },
        ];
      };
      marketplace_items: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: ItemCategory;
          price_gold: number;
          sprite_url: string;
          preview_url: string | null;
          career_compatibility: Json;
          rarity: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category: ItemCategory;
          price_gold: number;
          sprite_url: string;
          preview_url?: string | null;
          career_compatibility?: Json;
          rarity?: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          name?: string;
          description?: string | null;
          category?: ItemCategory;
          price_gold?: number;
          sprite_url?: string;
          preview_url?: string | null;
          career_compatibility?: Json;
          rarity?: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      student_inventory: {
        Row: {
          id: string;
          student_id: string;
          item_id: string;
          is_equipped: boolean;
          purchased_at: string;
          gold_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          item_id: string;
          is_equipped?: boolean;
          gold_spent: number;
        };
        Update: {
          is_equipped?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'student_inventory_item_id_fkey';
            columns: ['item_id'];
            referencedRelation: 'marketplace_items';
            referencedColumns: ['id'];
          },
        ];
      };
      activity_tracking: {
        Row: {
          id: string;
          student_id: string;
          activity_type: string;
          activity_metadata: Json;
          gems_awarded: number;
          created_at: string;
          gem_transaction_id: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          activity_type: string;
          activity_metadata?: Json;
          gems_awarded?: number;
          gem_transaction_id?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      attendance_streaks: {
        Row: {
          id: string;
          student_id: string;
          current_streak: number;
          longest_streak: number;
          last_attendance_date: string | null;
          streak_started_at: string | null;
          streak_broken_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_attendance_date?: string | null;
        };
        Update: {
          current_streak?: number;
          longest_streak?: number;
          last_attendance_date?: string | null;
          streak_started_at?: string | null;
          streak_broken_at?: string | null;
        };
        Relationships: [];
      };
      referral_codes: {
        Row: {
          id: string;
          student_id: string;
          referral_code: string;
          total_referrals: number;
          total_gems_earned: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          referral_code: string;
          is_active?: boolean;
        };
        Update: {
          total_referrals?: number;
          total_gems_earned?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          referral_code: string;
          gems_awarded_to_referrer: number;
          referred_completed_first_class: boolean;
          created_at: string;
          rewarded_at: string | null;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          referral_code: string;
          gems_awarded_to_referrer?: number;
        };
        Update: {
          gems_awarded_to_referrer?: number;
          referred_completed_first_class?: boolean;
          rewarded_at?: string | null;
        };
        Relationships: [];
      };
      parent_children: {
        Row: {
          id: string;
          parent_id: string;
          child_id: string;
          verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          child_id: string;
          verified?: boolean;
        };
        Update: {
          verified?: boolean;
        };
        Relationships: [];
      };

      gem_transaction_audit_log: {
        Row: { id: string; user_id: string; amount: number; action: string; description: string | null; created_at: string; metadata: Json | null };
        Insert: { id?: string; user_id: string; amount: number; action: string; description?: string | null; created_at?: string; metadata?: Json | null };
        Update: { description?: string | null; metadata?: Json | null };
        Relationships: [];
      };
    };
    Views: {
      user_gems_balances: {
        Row: {
          user_id: string;
          balance: number;
          transaction_count: number;
          total_earned: number;
          total_spent: number;
          last_transaction_at: string | null;
        };
      };
    };
    Functions: {
      get_gems_balance: {
        Args: { p_user_id: string };
        Returns: number;
      };
      refresh_gems_balances: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: {
      user_role: 'student' | 'teacher' | 'parent' | 'admin';
      booking_status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
      payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
      payment_provider: 'vnpay' | 'momo' | 'zalopay' | 'stripe';
      gem_transaction_type:
        | 'first_booking_bonus'
        | 'class_completion'
        | 'referral_bonus'
        | 'daily_login'
        | 'quiz_completion'
        | 'homework_submission'
        | 'admin_grant'
        | 'booking_discount'
        | 'admin_deduction';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// ============================================================================
// Enum Types
// ============================================================================

export type UserRole = Database['public']['Enums']['user_role'];
export type BookingStatus = Database['public']['Enums']['booking_status'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];
export type PaymentProvider = Database['public']['Enums']['payment_provider'];
export type GemTransactionType = Database['public']['Enums']['gem_transaction_type'];

export type ClassLevel = 'beginner' | 'elementary' | 'intermediate' | 'upper_intermediate' | 'advanced';
export type ScheduleType = 'one_time' | 'recurring';
export type ClassStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type SessionStatus = 'scheduled' | 'waiting' | 'live' | 'ended' | 'cancelled' | 'no_show';
export type NotificationType =
  | 'booking_confirmed' | 'booking_cancelled' | 'class_reminder'
  | 'gems_earned' | 'xp_earned' | 'achievement_unlocked' | 'level_up'
  | 'class_started' | 'class_ended' | 'payment_received'
  | 'system_announcement' | 'friend_request' | 'message_received';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type QuizDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank';
export type EarningStatus = 'pending' | 'earned' | 'processing' | 'paid' | 'cancelled';
export type PayoutMethod = 'bank_transfer' | 'paypal' | 'stripe' | 'wise' | 'cash';
export type PayoutStatus = 'pending' | 'reviewing' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
export type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ItemCategory = 'hat' | 'outfit' | 'accessory' | 'background' | 'effect' | 'emote';

// ============================================================================
// Helper Types
// ============================================================================

/** Extract the Row type for a given table name */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/** Extract the Insert type for a given table name */
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/** Extract the Update type for a given table name */
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

/** Extract enum values by enum name */
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

// ============================================================================
// Commonly Used Row Types
// ============================================================================

export type Profile = Tables<'profiles'>;
export type Class = Tables<'classes'>;
export type Booking = Tables<'bookings'>;
export type GemTransaction = Tables<'gem_transactions'>;
export type Payment = Tables<'payments'>;
export type Review = Tables<'reviews'>;
export type TeacherAvailability = Tables<'teacher_availability'>;
export type ClassSession = Tables<'class_sessions'>;
export type Notification = Tables<'notifications'>;
export type Quiz = Tables<'quizzes'>;
export type QuizQuestion = Tables<'quiz_questions'>;
export type QuizAttempt = Tables<'quiz_attempts'>;
export type TeacherEarning = Tables<'teacher_earnings'>;
export type PayoutRequest = Tables<'payout_requests'>;
export type CancellationLog = Tables<'cancellation_logs'>;
export type CareerPath = Tables<'career_paths'>;
export type StudentCareer = Tables<'student_careers'>;
export type XPTransaction = Tables<'xp_transactions'>;
export type CharacterSprite = Tables<'character_sprites'>;
export type MarketplaceItem = Tables<'marketplace_items'>;
export type StudentInventory = Tables<'student_inventory'>;
export type AttendanceStreak = Tables<'attendance_streaks'>;
export type ReferralCode = Tables<'referral_codes'>;
export type Referral = Tables<'referrals'>;
export type ParentChild = Tables<'parent_children'>;

// Legacy aliases for backward compatibility
export type CookieBalance = { user_id: string; balance: number };
export type CookieTransaction = GemTransaction;
export type TeacherProfile = Profile & { role: 'teacher' };
export type StudentCharacter = StudentCareer;
