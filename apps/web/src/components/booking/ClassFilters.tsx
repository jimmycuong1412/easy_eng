'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface ClassFilters {
  search: string;
  level: string[];
  duration: string[];
  priceRange: {
    min: number;
    max: number;
  };
  teacherId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface ClassFiltersProps {
  onFiltersChange: (filters: ClassFilters) => void;
  initialFilters?: Partial<ClassFilters>;
}

const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const DURATIONS = [
  { value: '25', label: '25 min' },
  { value: '50', label: '50 min' },
  { value: '75', label: '75 min' },
];

/**
 * Class Filters Component
 *
 * Provides filtering controls for class browsing:
 * - Text search by title/description
 * - Filter by level (beginner, intermediate, advanced)
 * - Filter by duration (25, 50, 75 minutes)
 * - Filter by price range
 * - Clear all filters
 */
export function ClassFilters({ onFiltersChange, initialFilters }: ClassFiltersProps) {
  const [filters, setFilters] = useState<ClassFilters>({
    search: initialFilters?.search || '',
    level: initialFilters?.level || [],
    duration: initialFilters?.duration || [],
    priceRange: initialFilters?.priceRange || { min: 0, max: 100 },
    teacherId: initialFilters?.teacherId,
    startDate: initialFilters?.startDate,
    endDate: initialFilters?.endDate,
  });

  const [showFilters, setShowFilters] = useState(false);

  const updateFilters = (updates: Partial<ClassFilters>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const toggleLevel = (level: string) => {
    const newLevels = filters.level.includes(level)
      ? filters.level.filter((l) => l !== level)
      : [...filters.level, level];
    updateFilters({ level: newLevels });
  };

  const toggleDuration = (duration: string) => {
    const newDurations = filters.duration.includes(duration)
      ? filters.duration.filter((d) => d !== duration)
      : [...filters.duration, duration];
    updateFilters({ duration: newDurations });
  };

  const clearFilters = () => {
    const clearedFilters: ClassFilters = {
      search: '',
      level: [],
      duration: [],
      priceRange: { min: 0, max: 100 },
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters =
    filters.search ||
    filters.level.length > 0 ||
    filters.duration.length > 0 ||
    filters.priceRange.min > 0 ||
    filters.priceRange.max < 100;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search classes by title or teacher..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 bg-purple-500 text-white rounded-full px-2 py-0.5 text-xs">
              Active
            </span>
          )}
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Filter Classes</CardTitle>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs"
              >
                <X className="h-3 w-3" />
                Clear All
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Level Filter */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Level
              </label>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => toggleLevel(level.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filters.level.includes(level.value)
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Filter */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((duration) => (
                  <button
                    key={duration.value}
                    onClick={() => toggleDuration(duration.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filters.duration.includes(duration.value)
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {duration.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Price Range: ${filters.priceRange.min} - ${filters.priceRange.max}
              </label>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 block mb-1">Min</label>
                  <Input
                    type="number"
                    min="0"
                    max={filters.priceRange.max}
                    value={filters.priceRange.min}
                    onChange={(e) =>
                      updateFilters({
                        priceRange: {
                          ...filters.priceRange,
                          min: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 block mb-1">Max</label>
                  <Input
                    type="number"
                    min={filters.priceRange.min}
                    max="1000"
                    value={filters.priceRange.max}
                    onChange={(e) =>
                      updateFilters({
                        priceRange: {
                          ...filters.priceRange,
                          max: parseInt(e.target.value) || 100,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
