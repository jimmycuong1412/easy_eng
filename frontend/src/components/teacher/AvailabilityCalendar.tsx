'use client';

/**
 * Availability Calendar Component
 *
 * Allows teachers to set their weekly availability schedule
 *
 * Related Tasks: T093 [P] [US4] Create teacher availability component
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Clock, Plus, X, Save, Loader2 } from 'lucide-react';

interface TimeSlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityCalendar() {
  const supabase = createClient();
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('teacher_availability')
        .select('*')
        .eq('teacher_id', user.id)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;

      setAvailability(data || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const addTimeSlot = (dayOfWeek: number) => {
    const newSlot: TimeSlot = {
      day_of_week: dayOfWeek,
      start_time: '09:00',
      end_time: '10:00',
      is_active: true,
    };
    setAvailability([...availability, newSlot]);
  };

  const removeTimeSlot = (index: number) => {
    setAvailability(availability.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: any) => {
    const updated = [...availability];
    updated[index] = { ...updated[index], [field]: value };
    setAvailability(updated);
  };

  const saveAvailability = async () => {
    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete existing availability
      await supabase.from('teacher_availability').delete().eq('teacher_id', user.id);

      // Insert new availability
      const slotsToInsert = availability.map((slot) => ({
        teacher_id: user.id,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_active: slot.is_active,
      }));

      if (slotsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('teacher_availability')
          .insert(slotsToInsert);

        if (insertError) throw insertError;
      }

      alert('Availability saved successfully!');
      loadAvailability();
    } catch (err: any) {
      setError(err.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {DAYS.map((day, dayIndex) => {
          const daySlots = availability.filter((slot) => slot.day_of_week === dayIndex);

          return (
            <div key={dayIndex} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">{day}</h4>
                <button
                  onClick={() => addTimeSlot(dayIndex)}
                  className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Time
                </button>
              </div>

              {daySlots.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No availability set</p>
              ) : (
                <div className="space-y-2">
                  {daySlots.map((slot, slotIndex) => {
                    const globalIndex = availability.findIndex(
                      (s) => s.day_of_week === slot.day_of_week && s.start_time === slot.start_time
                    );

                    return (
                      <div key={slotIndex} className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-gray-400" />
                        <input
                          type="time"
                          value={slot.start_time}
                          onChange={(e) => updateTimeSlot(globalIndex, 'start_time', e.target.value)}
                          className="rounded-md border border-gray-300 px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={slot.end_time}
                          onChange={(e) => updateTimeSlot(globalIndex, 'end_time', e.target.value)}
                          className="rounded-md border border-gray-300 px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        <button
                          onClick={() => removeTimeSlot(globalIndex)}
                          className="rounded-md p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={saveAvailability}
        disabled={saving}
        className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? (
          <span className="flex items-center justify-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Saving...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <Save className="mr-2 h-5 w-5" />
            Save Availability
          </span>
        )}
      </button>
    </div>
  );
}
