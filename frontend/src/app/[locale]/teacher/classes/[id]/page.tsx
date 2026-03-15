'use client';

export const dynamic = 'force-dynamic';

/**
 * Class Detail Page for Teachers
 *
 * Shows detailed information about a specific class:
 * - Class details with edit capability
 * - Enrolled students list
 * - Class materials
 * - Attendance tracking
 *
 * Related Tasks: T088 [P] [US4] Create class detail view for teachers
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ClassEditor from '@/components/teacher/ClassEditor';
import EnrolledStudentsList from '@/components/teacher/EnrolledStudentsList';
import ClassMaterialsUploader from '@/components/teacher/ClassMaterialsUploader';
import {
  ArrowLeft,
  Edit,
  Users,
  Calendar,
  Clock,
  DollarSign,
  BookOpen,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

interface ClassData {
  id: string;
  title: string;
  description: string;
  start_time: string;
  duration_minutes: number;
  max_students: number;
  price: number;
  level: string;
  tags: string[] | null;
  status: string;
  teacher: {
    full_name: string;
  };
  _count?: {
    bookings: number;
  };
}

export default function TeacherClassDetailPage() {
  const params = useParams();
  const classId = params.id as string;
  const supabase = createClient();

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'students' | 'materials'>('details');

  useEffect(() => {
    loadClassData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const loadClassData = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('classes')
        .select(
          `
          *,
          teacher:profiles!teacher_id (
            full_name
          )
        `
        )
        .eq('id', classId)
        .single();

      if (error) throw error;

      // Get booking count
      const { count } = await (supabase as any)
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .in('status', ['confirmed', 'pending']);

      setClassData({
        ...data,
        _count: { bookings: count || 0 },
      } as ClassData);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load class data');
      setLoading(false);
    }
  };

  const handleEditSuccess = () => {
    setEditMode(false);
    loadClassData();
  };

  const handleCancelClass = async () => {
    if (!confirm('Are you sure you want to cancel this class? Students will be notified.')) {
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('classes')
        .update({ status: 'cancelled' })
        .eq('id', classId);

      if (error) throw error;

      alert('Class cancelled successfully');
      loadClassData();
    } catch (err: any) {
      alert('Failed to cancel class: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-lg bg-red-50 p-6 dark:bg-red-900/20">
          <h2 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">Error</h2>
          <p className="text-red-700 dark:text-red-300">{error || 'Class not found'}</p>
          <Link
            href="/teacher/classes"
            className="mt-4 inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Classes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/teacher/classes"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Classes
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {classData.title}
              </h1>
              {classData.status === 'scheduled' && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle className="inline h-4 w-4 mr-1" />
                  Scheduled
                </span>
              )}
              {classData.status === 'cancelled' && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  <XCircle className="inline h-4 w-4 mr-1" />
                  Cancelled
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(classData.start_time).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(classData.start_time).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                ({classData.duration_minutes} min)
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {classData._count?.bookings || 0} / {classData.max_students} students
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                ${classData.price}
              </span>
            </div>
          </div>

          {!editMode && classData.status === 'scheduled' && (
            <div className="flex gap-2">
              <button
                onClick={() => setEditMode(true)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Edit className="inline h-4 w-4 mr-1" />
                Edit Class
              </button>
              <button
                onClick={handleCancelClass}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Cancel Class
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Class Details
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'students'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Enrolled Students ({classData._count?.bookings || 0})
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'materials'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Materials
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'details' && (
          <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
            {editMode ? (
              <ClassEditor
                classId={classId}
                onSuccess={handleEditSuccess}
                onCancel={() => setEditMode(false)}
              />
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Description
                  </h3>
                  <p className="text-gray-900 dark:text-white">{classData.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                      <BookOpen className="inline h-4 w-4 mr-1" />
                      Topic
                    </h3>
                    <p className="text-gray-900 dark:text-white">{classData.tags?.[0] || '—'}</p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                      Level
                    </h3>
                    <p className="text-gray-900 dark:text-white capitalize">{classData.level}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && <EnrolledStudentsList classId={classId} />}

        {activeTab === 'materials' && <ClassMaterialsUploader classId={classId} />}
      </div>
    </div>
  );
}
