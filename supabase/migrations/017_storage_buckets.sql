-- Migration: Setup Supabase Storage Buckets for Class Materials
-- Purpose: Allow teachers to upload and share class materials with students
-- Related to: Phase 6 - Teacher Class Management (T091)

-- Create storage bucket for class materials
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'class-materials',
  'class-materials',
  false, -- Private bucket, access controlled by RLS
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create table to track class materials metadata
CREATE TABLE IF NOT EXISTS public.class_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_class_materials_class_id ON public.class_materials(class_id);
CREATE INDEX idx_class_materials_teacher_id ON public.class_materials(teacher_id);
CREATE INDEX idx_class_materials_uploaded_at ON public.class_materials(uploaded_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_class_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER class_materials_updated_at
  BEFORE UPDATE ON public.class_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_class_materials_updated_at();

-- Row Level Security for class_materials table
ALTER TABLE public.class_materials ENABLE ROW LEVEL SECURITY;

-- Teachers can upload materials for their own classes
CREATE POLICY "Teachers can upload materials for own classes"
  ON public.class_materials
  FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = class_id AND teacher_id = auth.uid()
    )
  );

-- Teachers can view materials for their own classes
CREATE POLICY "Teachers can view own class materials"
  ON public.class_materials
  FOR SELECT
  USING (teacher_id = auth.uid());

-- Teachers can update/delete materials for their own classes
CREATE POLICY "Teachers can update own class materials"
  ON public.class_materials
  FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete own class materials"
  ON public.class_materials
  FOR DELETE
  USING (teacher_id = auth.uid());

-- Students can view materials for classes they're enrolled in
CREATE POLICY "Students can view materials for enrolled classes"
  ON public.class_materials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE class_id = class_materials.class_id
        AND student_id = auth.uid()
        AND status IN ('confirmed', 'attended')
    )
  );

-- Admins can view all materials
CREATE POLICY "Admins can view all materials"
  ON public.class_materials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Storage bucket RLS policies
CREATE POLICY "Teachers can upload to class-materials"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'class-materials' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Teachers can read own materials"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'class-materials' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Teachers can update own materials"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'class-materials' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Teachers can delete own materials"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'class-materials' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Students can read materials for enrolled classes
CREATE POLICY "Students can read materials for enrolled classes"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'class-materials' AND
    EXISTS (
      SELECT 1 FROM public.class_materials cm
      JOIN public.bookings b ON b.class_id = cm.class_id
      WHERE cm.file_path = name
        AND b.student_id = auth.uid()
        AND b.status IN ('confirmed', 'attended')
    )
  );

-- Comments
COMMENT ON TABLE public.class_materials IS 'Metadata for class materials uploaded by teachers';
COMMENT ON COLUMN public.class_materials.class_id IS 'Reference to the class this material belongs to';
COMMENT ON COLUMN public.class_materials.teacher_id IS 'Teacher who uploaded the material';
COMMENT ON COLUMN public.class_materials.file_path IS 'Path to file in Supabase Storage';
COMMENT ON COLUMN public.class_materials.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.class_materials.file_type IS 'MIME type of the file';
