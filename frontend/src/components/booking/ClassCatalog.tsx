/**
 * ClassCatalog Component
 * 
 * Browse and filter available classes
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ClassCard, ClassData } from './ClassCard';

interface ClassCatalogProps {
  onSelectClass?: (classData: ClassData) => void;
}

export function ClassCatalog({ onSelectClass }: ClassCatalogProps) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [availableOnly, setAvailableOnly] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, [levelFilter, availableOnly]);

  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (levelFilter) params.append('level', levelFilter);
      if (availableOnly) params.append('availableOnly', 'true');
      params.append('status', 'scheduled');

      const response = await fetch(`/api/classes?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }

      const data = await response.json();
      setClasses(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Level Filter */}
          <div>
            <label htmlFor="level-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Level
            </label>
            <select
              id="level-filter"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="elementary">Elementary</option>
              <option value="intermediate">Intermediate</option>
              <option value="upper_intermediate">Upper Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Availability Filter */}
          <div className="flex items-end">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Show only available classes</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Available Classes
        </h2>
        {!isLoading && (
          <span className="text-sm text-gray-600">
            {classes.length} {classes.length === 1 ? 'class' : 'classes'} found
          </span>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading classes</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchClasses}
            className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && classes.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No classes found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or check back later.
          </p>
        </div>
      )}

      {/* Classes Grid */}
      {!isLoading && !error && classes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classData) => (
            <ClassCard
              key={classData.id}
              classData={classData}
              onBook={(classId) => {
                const selectedClass = classes.find(c => c.id === classId);
                if (selectedClass && onSelectClass) {
                  onSelectClass(selectedClass);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
