/**
 * ClassCard Component
 * 
 * Displays a class with booking option
 */

'use client';

import React from 'react';

export interface ClassData {
  id: string;
  title: string;
  description: string;
  level: string;
  price: number;
  currency: string;
  max_students: number;
  current_enrollments: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: string;
  teacher?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface ClassCardProps {
  classData: ClassData;
  onBook?: (classId: string) => void;
  showBookButton?: boolean;
}

export function ClassCard({ 
  classData, 
  onBook,
  showBookButton = true 
}: ClassCardProps) {
  const spotsLeft = classData.max_students - classData.current_enrollments;
  const isFull = spotsLeft <= 0;
  const startDate = new Date(classData.start_time);

  const levelColors = {
    beginner: 'bg-green-100 text-green-800',
    elementary: 'bg-blue-100 text-blue-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    upper_intermediate: 'bg-orange-100 text-orange-800',
    advanced: 'bg-red-100 text-red-800',
  };

  const levelColor = levelColors[classData.level as keyof typeof levelColors] || 'bg-gray-100 text-gray-800';

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-semibold text-gray-900 flex-1">
          {classData.title}
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${levelColor}`}>
          {classData.level.replace('_', ' ')}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {classData.description}
      </p>

      {/* Teacher Info */}
      {classData.teacher && (
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>{classData.teacher.full_name}</span>
        </div>
      )}

      {/* Schedule Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{startDate.toLocaleDateString()} at {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{classData.duration_minutes} minutes</span>
        </div>
      </div>

      {/* Enrollment Info */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Enrollment:</span>
          <span className={`font-medium ${isFull ? 'text-red-600' : 'text-gray-900'}`}>
            {classData.current_enrollments} / {classData.max_students}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${isFull ? 'bg-red-500' : 'bg-indigo-600'}`}
            style={{ width: `${(classData.current_enrollments / classData.max_students) * 100}%` }}
          />
        </div>
        {spotsLeft > 0 && spotsLeft <= 3 && (
          <p className="text-xs text-amber-600 mt-1">
            Only {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left!
          </p>
        )}
      </div>

      {/* Price and Action */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          <div className="text-2xl font-bold text-indigo-600">
            ${classData.price.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">
            Use Gems for discount
          </div>
        </div>

        {showBookButton && (
          <button
            onClick={() => onBook?.(classData.id)}
            disabled={isFull}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isFull
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isFull ? 'Full' : 'Book Now'}
          </button>
        )}
      </div>
    </div>
  );
}
