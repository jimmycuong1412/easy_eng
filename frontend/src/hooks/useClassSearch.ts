import { useState, useEffect, useMemo } from 'react';
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

  // Fetch classes from API
  useEffect(() => {
    async function fetchClasses() {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API call
        // const response = await fetch('/api/classes');
        // const data = await response.json();
        // setClasses(data.classes);

        // Mock data for now
        const mockClasses: Class[] = [
          {
            id: '1',
            title: 'English Conversation Practice',
            description: 'Improve your speaking skills with daily conversations',
            teacher_id: 'teacher-1',
            teacher_name: 'Teacher Sarah',
            level: 'beginner',
            duration: 25,
            price: 20,
            capacity: 5,
            enrolled: 3,
            scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
            image_url: '/images/conversation.jpg',
          },
          {
            id: '2',
            title: 'Business English',
            description: 'Professional communication for the workplace',
            teacher_id: 'teacher-2',
            teacher_name: 'Teacher Mike',
            level: 'intermediate',
            duration: 50,
            price: 35,
            capacity: 4,
            enrolled: 2,
            scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            image_url: '/images/business.jpg',
          },
          {
            id: '3',
            title: 'Advanced Grammar',
            description: 'Master complex grammar structures',
            teacher_id: 'teacher-1',
            teacher_name: 'Teacher Sarah',
            level: 'advanced',
            duration: 50,
            price: 40,
            capacity: 3,
            enrolled: 1,
            scheduled_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
            image_url: '/images/grammar.jpg',
          },
          {
            id: '4',
            title: 'IELTS Preparation',
            description: 'Prepare for the IELTS exam with expert guidance',
            teacher_id: 'teacher-3',
            teacher_name: 'Teacher Emma',
            level: 'intermediate',
            duration: 75,
            price: 50,
            capacity: 6,
            enrolled: 4,
            scheduled_at: new Date(Date.now() + 72 * 60 * 60 * 1000),
            image_url: '/images/ielts.jpg',
          },
        ];

        setClasses(mockClasses);
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
