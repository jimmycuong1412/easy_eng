'use client';

/**
 * Class Materials Uploader Component
 *
 * Allows teachers to upload and manage class materials:
 * - Upload files (PDFs, documents, images)
 * - Manage uploaded materials
 * - Share materials with students
 *
 * Related Tasks: T090 [P] [US4] Create class materials uploader
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Upload, File, X, Download, Loader2, FileText, Image as ImageIcon } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

interface ClassMaterialsUploaderProps {
  classId: string;
}

export default function ClassMaterialsUploader({ classId }: ClassMaterialsUploaderProps) {
  const supabase = createClient();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMaterials();
  }, [classId]);

  const loadMaterials = async () => {
    try {
      // Note: This requires the storage bucket and metadata table to be set up
      // For now, we'll use a placeholder
      setMaterials([]);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload to Supabase Storage
      const filePath = `class-materials/${classId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('class-materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create metadata record (requires migration T091)
      // For now, show success message
      alert('File uploaded successfully! (Metadata storage pending migration T091)');

      loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (_materialId: string) => {
    if (!confirm('Are you sure you want to delete this material?')) {
      return;
    }

    try {
      // Delete from storage and metadata
      alert('Delete functionality pending migration T091');
      loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to delete material');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    }
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-600 dark:bg-gray-800">
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Upload Class Materials
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          PDF, DOC, DOCX, Images (Max 10MB)
        </p>

        <label
          htmlFor="file-upload"
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              Choose File
            </>
          )}
        </label>
        <input
          id="file-upload"
          type="file"
          onChange={handleFileUpload}
          disabled={uploading}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Materials List */}
      {materials.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            Uploaded Materials ({materials.length})
          </h4>
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center gap-4">
                {getFileIcon(material.file_type)}
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white">{material.name}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatFileSize(material.file_size)} •{' '}
                    {new Date(material.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open(material.file_path, '_blank')}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Download className="inline h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(material.id)}
                  className="rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <X className="inline h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-8 text-center dark:bg-gray-800">
          <File className="mx-auto h-12 w-12 text-gray-400" />
          <h4 className="mt-4 font-semibold text-gray-900 dark:text-white">No Materials Yet</h4>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Upload files to share with your students
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h4 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">Note</h4>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Materials uploaded here will be accessible to all students enrolled in this class. Make
          sure files don't contain sensitive information.
        </p>
      </div>
    </div>
  );
}
