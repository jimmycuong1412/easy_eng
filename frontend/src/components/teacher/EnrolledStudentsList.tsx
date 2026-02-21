'use client';

/**
 * Enrolled Students List Component
 *
 * Displays list of students enrolled in a class:
 * - Student name and profile
 * - Booking details (gems used, price paid)
 * - Contact information
 * - Attendance status
 *
 * Related Tasks: T089 [P] [US4] Create enrolled students list component
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { User, Mail, DollarSign, Gem, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface EnrolledStudent {
  id: string;
  student_id: string;
  final_price: number;
  gems_used: number;
  status: string;
  created_at: string;
  student: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface EnrolledStudentsListProps {
  classId: string;
}

export default function EnrolledStudentsList({ classId }: EnrolledStudentsListProps) {
  const supabase = createClient();
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          id,
          student_id,
          final_price,
          gems_used,
          status,
          created_at,
          student:profiles!student_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `
        )
        .eq('class_id', classId)
        .in('status', ['confirmed', 'pending'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      setStudents(data as any);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load students');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 dark:bg-red-900/20">
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-12 text-center dark:bg-gray-800">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          No Students Enrolled Yet
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Students who book this class will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>{students.length}</strong> student{students.length !== 1 ? 's' : ''} enrolled
        </p>
      </div>

      <div className="space-y-3">
        {students.map((enrollment) => (
          <div
            key={enrollment.id}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                  {enrollment.student.avatar_url ? (
                    <Image
                      src={enrollment.student.avatar_url}
                      alt={enrollment.student.full_name}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full"
                    />
                  ) : (
                    <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  )}
                </div>

                {/* Student Info */}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {enrollment.student.full_name}
                  </h4>
                  <div className="mt-1 flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4" />
                    {enrollment.student.email}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {/* Price Paid */}
                    <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold">${enrollment.final_price.toFixed(2)}</span>
                    </div>

                    {/* Gems Used */}
                    {enrollment.gems_used > 0 && (
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Gem className="h-4 w-4" />
                        <span className="font-semibold">{enrollment.gems_used} gems used</span>
                      </div>
                    )}

                    {/* Booking Date */}
                    <div className="text-gray-500 dark:text-gray-400">
                      Booked{' '}
                      {new Date(enrollment.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {enrollment.status === 'confirmed' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    Confirmed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                    <XCircle className="h-3 w-3" />
                    Pending
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">Class Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Total Students</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{students.length}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Total Revenue</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              ${students.reduce((sum, s) => sum + s.final_price, 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Gems Discounts</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {students.reduce((sum, s) => sum + s.gems_used, 0)} gems
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Avg Price</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ${(students.reduce((sum, s) => sum + s.final_price, 0) / students.length).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
