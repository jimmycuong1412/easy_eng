'use client';

/**
 * Class Editor Component
 *
 * Allows teachers to edit existing class details.
 * Similar to CreateClassForm but for editing with pre-populated data.
 *
 * Related Tasks: T085 [P] [US4] Create class editor component
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Clock, Users, DollarSign, BookOpen, Loader2, Save } from 'lucide-react';

interface ClassData {
  id: string;
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: number;
  capacity: number;
  price: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  topic: string;
  status: string;
}

interface ClassEditorProps {
  classId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ClassEditor({ classId, onSuccess, onCancel }: ClassEditorProps) {
  const supabase = createClient();

  const [formData, setFormData] = useState<Partial<ClassData>>({});
  const [originalData, setOriginalData] = useState<Partial<ClassData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadClassData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const loadClassData = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (error) throw error;

      setFormData(data);
      setOriginalData(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load class data');
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      errors.title = 'Title must be at least 5 characters';
    }

    if (!formData.description?.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length < 20) {
      errors.description = 'Description must be at least 20 characters';
    }

    if (!formData.scheduled_at) {
      errors.scheduled_at = 'Schedule is required';
    }

    if (formData.duration_minutes && formData.duration_minutes < 25) {
      errors.duration_minutes = 'Duration must be at least 25 minutes';
    }

    if (formData.capacity && formData.capacity < 1) {
      errors.capacity = 'Capacity must be at least 1';
    }

    if (formData.price && formData.price < 5) {
      errors.price = 'Price must be at least $5';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Only update fields that have changed
      const updates: Partial<ClassData> = {};
      Object.keys(formData).forEach((key) => {
        if (formData[key as keyof ClassData] !== originalData[key as keyof ClassData]) {
          updates[key as keyof ClassData] = formData[key as keyof ClassData] as any;
        }
      });

      if (Object.keys(updates).length === 0) {
        setError('No changes detected');
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', classId);

      if (updateError) throw updateError;

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update class');
    } finally {
      setSaving(false);
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

    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const hasChanges = (): boolean => {
    return Object.keys(formData).some(
      (key) => formData[key as keyof ClassData] !== originalData[key as keyof ClassData]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Class Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title || ''}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${
            validationErrors.title
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
          }`}
        />
        {validationErrors.title && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          rows={4}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${
            validationErrors.description
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
          }`}
        />
        {validationErrors.description && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Topic */}
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <BookOpen className="inline h-4 w-4 mr-1" />
            Topic
          </label>
          <input
            type="text"
            id="topic"
            name="topic"
            value={formData.topic || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Level */}
        <div>
          <label htmlFor="level" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Level
          </label>
          <select
            id="level"
            name="level"
            value={formData.level || 'intermediate'}
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
            Date & Time
          </label>
          <input
            type="datetime-local"
            id="scheduled_at"
            name="scheduled_at"
            value={formData.scheduled_at ? new Date(formData.scheduled_at).toISOString().slice(0, 16) : ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Duration */}
        <div>
          <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Clock className="inline h-4 w-4 mr-1" />
            Duration (minutes)
          </label>
          <select
            id="duration_minutes"
            name="duration_minutes"
            value={formData.duration_minutes || 25}
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
            Max Students
          </label>
          <input
            type="number"
            id="capacity"
            name="capacity"
            value={formData.capacity || 10}
            onChange={handleChange}
            min="1"
            max="50"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <DollarSign className="inline h-4 w-4 mr-1" />
            Price (USD)
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price || 25}
            onChange={handleChange}
            min="5"
            max="500"
            step="0.01"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
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
          disabled={saving || !hasChanges()}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center justify-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <Save className="mr-2 h-5 w-5" />
              Save Changes
            </span>
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        )}
      </div>

      {hasChanges() && (
        <p className="text-center text-sm text-amber-600 dark:text-amber-400">
          You have unsaved changes
        </p>
      )}
    </form>
  );
}
