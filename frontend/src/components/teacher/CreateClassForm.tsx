'use client';

/**
 * Create Class Form Component
 *
 * Allows teachers to create new classes with all required details:
 * - Title and description
 * - Schedule (date, time, duration)
 * - Capacity and pricing
 * - Class level and topic
 *
 * Related Tasks: T084 [P] [US4] Create class creation form component
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Clock, Users, DollarSign, BookOpen, Loader2 } from 'lucide-react';

interface ClassFormData {
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: number;
  capacity: number;
  price: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  topic: string;
}

interface CreateClassFormProps {
  onSuccess?: (classId: string) => void;
  onCancel?: () => void;
}

export default function CreateClassForm({ onSuccess, onCancel }: CreateClassFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState<ClassFormData>({
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 25,
    capacity: 10,
    price: 25,
    level: 'intermediate',
    topic: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Title validation
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      errors.title = 'Title must be at least 5 characters';
    } else if (formData.title.length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }

    // Description validation
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length < 20) {
      errors.description = 'Description must be at least 20 characters';
    }

    // Schedule validation
    if (!formData.scheduled_at) {
      errors.scheduled_at = 'Schedule date and time is required';
    } else {
      const scheduledDate = new Date(formData.scheduled_at);
      const now = new Date();
      if (scheduledDate <= now) {
        errors.scheduled_at = 'Class must be scheduled in the future';
      }
      if (scheduledDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
        errors.scheduled_at = 'Class must be scheduled at least 24 hours in advance';
      }
    }

    // Duration validation
    if (formData.duration_minutes < 25) {
      errors.duration_minutes = 'Duration must be at least 25 minutes';
    } else if (formData.duration_minutes > 120) {
      errors.duration_minutes = 'Duration cannot exceed 120 minutes';
    }

    // Capacity validation
    if (formData.capacity < 1) {
      errors.capacity = 'Capacity must be at least 1 student';
    } else if (formData.capacity > 50) {
      errors.capacity = 'Capacity cannot exceed 50 students';
    }

    // Price validation (in VND)
    if (formData.price < 0) {
      errors.price = 'Price must be 0 or greater';
    }

    // Topic validation
    if (!formData.topic.trim()) {
      errors.topic = 'Topic is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Verify user is a teacher
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'teacher') {
        throw new Error('Only teachers can create classes');
      }

      // Map form fields to DB columns
      const startTime = new Date(formData.scheduled_at);
      const endTime = new Date(startTime.getTime() + formData.duration_minutes * 60 * 1000);

      // Create class
      const { data: newClass, error: createError } = await supabase
        .from('classes')
        .insert({
          teacher_id: user.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: formData.duration_minutes,
          max_students: formData.capacity,
          price: formData.price,
          level: formData.level,
          tags: [formData.topic.trim()],
          schedule_type: 'one_time',
          status: 'scheduled',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Success
      if (onSuccess) {
        onSuccess(newClass.id);
      } else {
        router.push(`/teacher/classes/${newClass.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create class');
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Class Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g., Business English Conversation"
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${
            validationErrors.title
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
          }`}
        />
        {validationErrors.title && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          placeholder="Describe what students will learn in this class..."
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${
            validationErrors.description
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
          }`}
        />
        {validationErrors.description && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Topic */}
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <BookOpen className="inline h-4 w-4 mr-1" />
            Topic *
          </label>
          <input
            type="text"
            id="topic"
            name="topic"
            value={formData.topic}
            onChange={handleChange}
            placeholder="e.g., Daily Conversation, IELTS Prep"
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${
              validationErrors.topic
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
            }`}
          />
          {validationErrors.topic && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.topic}</p>
          )}
        </div>

        {/* Level */}
        <div>
          <label htmlFor="level" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Level
          </label>
          <select
            id="level"
            name="level"
            value={formData.level}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Scheduled At */}
        <div>
          <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Calendar className="inline h-4 w-4 mr-1" />
            Date & Time *
          </label>
          <input
            type="datetime-local"
            id="scheduled_at"
            name="scheduled_at"
            value={formData.scheduled_at}
            onChange={handleChange}
            min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${
              validationErrors.scheduled_at
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
            }`}
          />
          {validationErrors.scheduled_at && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.scheduled_at}</p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Clock className="inline h-4 w-4 mr-1" />
            Duration (minutes) *
          </label>
          <select
            id="duration_minutes"
            name="duration_minutes"
            value={formData.duration_minutes}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="25">25 minutes</option>
            <option value="50">50 minutes</option>
            <option value="75">75 minutes</option>
            <option value="90">90 minutes</option>
            <option value="120">120 minutes</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Capacity */}
        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Users className="inline h-4 w-4 mr-1" />
            Max Students *
          </label>
          <input
            type="number"
            id="capacity"
            name="capacity"
            value={formData.capacity}
            onChange={handleChange}
            min="1"
            max="50"
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${
              validationErrors.capacity
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
            }`}
          />
          {validationErrors.capacity && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.capacity}</p>
          )}
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <DollarSign className="inline h-4 w-4 mr-1" />
            Price (USD) *
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            min="0"
            step="1000"
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${
              validationErrors.price
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
            }`}
          />
          {validationErrors.price && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.price}</p>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating...
            </span>
          ) : (
            'Create Class'
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
