/**
 * Bookings API Routes
 * 
 * Endpoints for class booking operations with Gems discount
 */

import { Router, Request, Response } from 'express';
import {
  processBookingWithGems,
  cancelBooking,
  getUserBookings,
  getBookingById,
} from '../services/booking.service';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();

/**
 * POST /api/bookings/process
 * Process a new booking with Gems discount
 */
router.post(
  '/process',
  [
    body('classId').isUUID().withMessage('Valid class ID is required'),
    body('gemsToUse').isInt({ min: 0 }).withMessage('Gems must be a non-negative integer'),
    body('paymentMethodId').optional().isString(),
    body('idempotencyKey').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id; // Assumes auth middleware sets req.user
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { classId, gemsToUse, paymentMethodId, idempotencyKey } = req.body;

      const booking = await processBookingWithGems({
        userId,
        classId,
        gemsToUse,
        paymentMethodId,
        idempotencyKey,
      });

      return res.status(201).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Booking processing failed';
      
      // Determine appropriate status code
      let statusCode = 500;
      if (message.includes('not found')) statusCode = 404;
      else if (message.includes('full')) statusCode = 409;
      else if (message.includes('Insufficient Gems')) statusCode = 400;
      else if (message.includes('must be at least')) statusCode = 400;
      else if (message.includes('cannot exceed')) statusCode = 400;

      return res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * GET /api/bookings
 * Get user's bookings with optional filtering
 */
router.get(
  '/',
  [
    query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const result = await getUserBookings({
        userId,
        status,
        limit,
        offset,
      });

      return res.status(200).json({
        success: true,
        data: result.bookings,
        pagination: {
          limit,
          offset,
          total: result.total,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get bookings';
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * GET /api/bookings/:id
 * Get booking details by ID
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Valid booking ID is required'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const booking = await getBookingById(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found',
        });
      }

      // Verify user owns this booking (unless admin)
      if (booking.user_id !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      return res.status(200).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get booking';
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * PATCH /api/bookings/:id/cancel
 * Cancel a booking and refund Gems
 */
router.patch(
  '/:id/cancel',
  [
    param('id').isUUID().withMessage('Valid booking ID is required'),
    body('reason').optional().isString().withMessage('Cancellation reason must be a string'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { reason } = req.body;

      const cancelledBooking = await cancelBooking({
        bookingId: req.params.id,
        userId,
        reason,
      });

      return res.status(200).json({
        success: true,
        data: cancelledBooking,
        message: 'Booking cancelled successfully. Gems have been refunded.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel booking';
      
      let statusCode = 500;
      if (message.includes('not found')) statusCode = 404;
      else if (message.includes('already cancelled')) statusCode = 409;
      else if (message.includes('Cannot cancel')) statusCode = 400;

      return res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }
);

export default router;
