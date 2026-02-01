/**
 * Validate Class Edge Function
 *
 * Validates class data before creation/update:
 * - Schedule validation (future date, no conflicts)
 * - Capacity validation (within limits)
 * - Price validation (minimum $5)
 * - Teacher availability check
 *
 * Related Tasks: T086 [US4] Implement class validation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface ValidationRequest {
  teacher_id: string;
  scheduled_at: string;
  duration_minutes: number;
  capacity: number;
  price: number;
  class_id?: string; // For updates
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { teacher_id, scheduled_at, duration_minutes, capacity, price, class_id } =
      (await req.json()) as ValidationRequest;

    const errors: string[] = [];

    // Validate schedule (must be in future)
    const scheduledDate = new Date(scheduled_at);
    const now = new Date();

    if (scheduledDate <= now) {
      errors.push('Class must be scheduled in the future');
    }

    // Validate at least 24 hours advance notice
    const hoursUntilClass = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilClass < 24) {
      errors.push('Class must be scheduled at least 24 hours in advance');
    }

    // Validate duration
    if (duration_minutes < 25) {
      errors.push('Duration must be at least 25 minutes');
    }
    if (duration_minutes > 120) {
      errors.push('Duration cannot exceed 120 minutes');
    }

    // Validate capacity
    if (capacity < 1) {
      errors.push('Capacity must be at least 1 student');
    }
    if (capacity > 50) {
      errors.push('Capacity cannot exceed 50 students');
    }

    // Validate price
    if (price < 5) {
      errors.push('Price must be at least $5.00');
    }
    if (price > 500) {
      errors.push('Price cannot exceed $500.00');
    }

    // Check for scheduling conflicts
    const classEndTime = new Date(scheduledDate.getTime() + duration_minutes * 60000);

    const { data: conflicts } = await supabaseClient
      .from('classes')
      .select('id, title, scheduled_at, duration_minutes')
      .eq('teacher_id', teacher_id)
      .neq('status', 'cancelled')
      .gte('scheduled_at', now.toISOString());

    if (conflicts) {
      for (const existingClass of conflicts) {
        // Skip if this is the class being updated
        if (class_id && existingClass.id === class_id) continue;

        const existingStart = new Date(existingClass.scheduled_at);
        const existingEnd = new Date(
          existingStart.getTime() + existingClass.duration_minutes * 60000
        );

        // Check for overlap
        if (
          (scheduledDate >= existingStart && scheduledDate < existingEnd) ||
          (classEndTime > existingStart && classEndTime <= existingEnd) ||
          (scheduledDate <= existingStart && classEndTime >= existingEnd)
        ) {
          errors.push(
            `Schedule conflicts with "${existingClass.title}" at ${existingStart.toLocaleString()}`
          );
          break;
        }
      }
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
    };

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
