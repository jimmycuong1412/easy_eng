/**
 * Classes API Routes
 * 
 * Endpoints for class management and browsing
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();

/**
 * GET /api/classes
 * List available classes with filters
 */
router.get(
  '/',
  [
    query('level').optional().isIn(['beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced']),
    query('status').optional().isIn(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled']),
    query('teacherId').optional().isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('availableOnly').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const level = req.query.level as string | undefined;
      const status = req.query.status as string | undefined;
      const teacherId = req.query.teacherId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const availableOnly = req.query.availableOnly === 'true';

      let query = supabase
        .from('classes')
        .select('*, teacher:profiles!classes_teacher_id_fkey(id, full_name, email)', { count: 'exact' })
        .eq('is_active', true)
        .order('start_time', { ascending: true })
        .range(offset, offset + limit - 1);

      if (level) {
        query = query.eq('level', level);
      }

      if (status) {
        query = query.eq('status', status);
      } else {
        // By default, only show scheduled classes
        query = query.eq('status', 'scheduled');
      }

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      if (availableOnly) {
        // Filter for classes with available spots
        query = query.filter('current_enrollments', 'lt', 'max_students');
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to get classes: ${error.message}`);
      }

      return res.status(200).json({
        success: true,
        data: data || [],
        pagination: {
          limit,
          offset,
          total: count || 0,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get classes';
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * GET /api/classes/:id
 * Get class details by ID
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Valid class ID is required'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*, teacher:profiles!classes_teacher_id_fkey(id, full_name, email, bio)')
        .eq('id', req.params.id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to get class: ${error.message}`);
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Class not found',
        });
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get class';
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * POST /api/classes
 * Create a new class (teachers only)
 */
router.post(
  '/',
  [
    body('title').isString().notEmpty().withMessage('Title is required'),
    body('description').isString().notEmpty().withMessage('Description is required'),
    body('level').isIn(['beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced']),
    body('price').isFloat({ min: 5 }).withMessage('Price must be at least $5'),
    body('maxStudents').isInt({ min: 1, max: 50 }).withMessage('Max students must be between 1 and 50'),
    body('startTime').isISO8601().withMessage('Valid start time is required'),
    body('endTime').isISO8601().withMessage('Valid end time is required'),
    body('durationMinutes').isInt({ min: 15, max: 300 }).withMessage('Duration must be between 15 and 300 minutes'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (userRole !== 'teacher' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Only teachers can create classes' });
      }

      const {
        title,
        description,
        level,
        price,
        maxStudents,
        startTime,
        endTime,
        durationMinutes,
        scheduleType = 'one_time',
        timezone = 'UTC',
        materialsUrl,
        meetingLink,
        tags,
      } = req.body;

      const { data, error } = await supabase
        .from('classes')
        .insert({
          teacher_id: userId,
          title,
          description,
          level,
          price,
          max_students: maxStudents,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: durationMinutes,
          schedule_type: scheduleType,
          timezone,
          materials_url: materialsUrl || null,
          meeting_link: meetingLink || null,
          tags: tags || [],
          status: 'scheduled',
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create class: ${error.message}`);
      }

      return res.status(201).json({
        success: true,
        data,
        message: 'Class created successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create class';
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * PATCH /api/classes/:id
 * Update a class (teachers only - own classes)
 */
router.patch(
  '/:id',
  [
    param('id').isUUID().withMessage('Valid class ID is required'),
    body('title').optional().isString(),
    body('description').optional().isString(),
    body('price').optional().isFloat({ min: 5 }),
    body('maxStudents').optional().isInt({ min: 1, max: 50 }),
    body('startTime').optional().isISO8601(),
    body('endTime').optional().isISO8601(),
    body('status').optional().isIn(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled']),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify ownership (unless admin)
      if (userRole !== 'admin') {
        const { data: classData } = await supabase
          .from('classes')
          .select('teacher_id')
          .eq('id', req.params.id)
          .maybeSingle();

        if (!classData) {
          return res.status(404).json({ error: 'Class not found' });
        }

        if (classData.teacher_id !== userId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      const updates: any = {};
      const allowedFields = ['title', 'description', 'price', 'maxStudents', 'startTime', 'endTime', 'status', 'materialsUrl', 'meetingLink', 'tags'];
      
      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          // Convert camelCase to snake_case
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          updates[snakeKey] = req.body[key];
        }
      });

      const { data, error } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update class: ${error.message}`);
      }

      return res.status(200).json({
        success: true,
        data,
        message: 'Class updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update class';
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * DELETE /api/classes/:id
 * Delete a class (soft delete - set is_active to false)
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Valid class ID is required'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify ownership (unless admin)
      if (userRole !== 'admin') {
        const { data: classData } = await supabase
          .from('classes')
          .select('teacher_id')
          .eq('id', req.params.id)
          .maybeSingle();

        if (!classData) {
          return res.status(404).json({ error: 'Class not found' });
        }

        if (classData.teacher_id !== userId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Soft delete
      const { error } = await supabase
        .from('classes')
        .update({ is_active: false, status: 'cancelled' })
        .eq('id', req.params.id);

      if (error) {
        throw new Error(`Failed to delete class: ${error.message}`);
      }

      return res.status(200).json({
        success: true,
        message: 'Class deleted successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete class';
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

export default router;
