'use client';

/**
 * Create New Class Page
 *
 * Teacher page for creating a new class.
 * Uses CreateClassForm component.
 *
 * Related Tasks: T087 [US4] Create class creation page
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import CreateClassForm from '@/components/teacher/CreateClassForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewClassPage() {
  const router = useRouter();

  const handleSuccess = (classId: string) => {
    router.push(`/teacher/classes/${classId}`);
  };

  const handleCancel = () => {
    router.push('/teacher/classes');
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/teacher/classes"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Classes
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Create New Class
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Fill in the details below to create a new class for your students
        </p>
      </div>

      {/* Form */}
      <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
        <CreateClassForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>

      {/* Help Text */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
          Tips for Creating a Great Class
        </h3>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>• Use a clear, descriptive title that tells students what they'll learn</li>
          <li>• Include specific learning objectives in the description</li>
          <li>• Schedule classes at least 24 hours in advance</li>
          <li>• Set a capacity that allows for interactive discussion</li>
          <li>• Price fairly based on class duration and difficulty level</li>
        </ul>
      </div>
    </div>
  );
}
