import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ClassFilters } from '@/components/booking/ClassFilters';

export interface Class {
  id: string;
  title: string;
  description: string;
  teacher_id: string;
  teacher_name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  price: number;
  capacity: number;
  enrolled: number;
  scheduled_at: Date;
  image_url?: string;
}

interface UseClassSearchOptions {
  initialFilters?: Partial<ClassFilters>;
}

/**
 * Class Search Hook
 *
 * Provides class filtering and search functionality:
 * - Fetches classes from Supabase with teacher profile joins
 * - Client-side filtering by level, duration, price
 * - Text search across title, description, teacher name
 * - Sorts by relevance and date
 * - Returns filtered and paginated results
 */
export function useClassSearch(options: UseClassSearchOptions = {}) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ClassFilters>({
    search: options.initialFilters?.search || '',
    level: options.initialFilters?.level || [],
    duration: options.initialFilters?.duration || [],
    priceRange: options.initialFilters?.priceRange || { min: 0, max: 100 },
  });

  // Fetch classes from Supabase
  useEffect(() => {
    async function fetchClasses() {
      try {
        setIsLoading(true);
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from('classes')
          .select(`
            id,
            title,
            description,
            teacher_id,
            level,
            price,
            duration_minutes,
            max_students,
            current_enrollments,
            start_time,
            materials_url,
            profiles!classes_teacher_id_profiles_fkey ( full_name, avatar_url )
          `)
          .eq('is_active', true)
          .in('status', ['scheduled', 'draft'])
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true });

        if (fetchError) throw fetchError;

        const mapped: Class[] = (data || []).map((row) => {
          const teacherProfile = row.profiles as unknown as { full_name: string | null; avatar_url: string | null } | null;
          return {
            id: row.id,
            title: row.title,
            description: row.description || '',
            teacher_id: row.teacher_id,
            teacher_name: teacherProfile?.full_name || 'Unknown Teacher',
            level: row.level as Class['level'],
            duration: row.duration_minutes,
            price: row.price,
            capacity: row.max_students,
            enrolled: row.current_enrollments,
            scheduled_at: new Date(row.start_time),
            image_url: teacherProfile?.avatar_url || undefined,
          };
        });

        setClasses(mapped);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch classes'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchClasses();
  }, []);

  // Filter and search classes
  const filteredClasses = useMemo(() => {
    let results = [...classes];

    // Text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(
        (cls) =>
          cls.title.toLowerCase().includes(searchLower) ||
          cls.description.toLowerCase().includes(searchLower) ||
          cls.teacher_name.toLowerCase().includes(searchLower)
      );
    }

    // Level filter
    if (filters.level.length > 0) {
      results = results.filter((cls) => filters.level.includes(cls.level));
    }

    // Duration filter
    if (filters.duration.length > 0) {
      results = results.filter((cls) =>
        filters.duration.includes(cls.duration.toString())
      );
    }

    // Price range filter
    results = results.filter(
      (cls) =>
        cls.price >= filters.priceRange.min && cls.price <= filters.priceRange.max
    );

    // Sort by scheduled date (upcoming first)
    results.sort((a, b) => a.scheduled_at.getTime() - b.scheduled_at.getTime());

    return results;
  }, [classes, filters]);

  return {
    classes: filteredClasses,
    allClasses: classes,
    isLoading,
    error,
    filters,
    setFilters,
    totalCount: filteredClasses.length,
    allCount: classes.length,
  };
}
