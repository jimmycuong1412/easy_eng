import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { gemsAuditService } from '../../services/gems-audit.service';

const router = Router();

// Validation schema for gem adjustment
const gemAdjustmentSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
  adjustmentType: z.enum(['add', 'subtract', 'set'], {
    errorMap: () => ({ message: 'Adjustment type must be add, subtract, or set' }),
  }),
  amount: z.number().int().positive('Amount must be a positive integer'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason is too long'),
  notes: z.string().max(1000, 'Notes are too long').optional(),
});

type GemAdjustmentRequest = z.infer<typeof gemAdjustmentSchema>;

/**
 * POST /api/admin/gems/adjust
 * Adjust a student's gem balance (admin only)
 */
router.post(
  '/adjust',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validatedData = gemAdjustmentSchema.parse(req.body);

      // Get admin user from auth middleware
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized - admin authentication required',
        });
      }

      // Verify admin role
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: adminProfile, error: adminError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', adminUserId)
        .single();

      if (adminError || adminProfile?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden - admin role required',
        });
      }

      // Verify student exists and has student role
      const { data: student, error: studentError } = await supabase
        .from('profiles')
        .select('id, role, display_name')
        .eq('id', validatedData.studentId)
        .single();

      if (studentError || !student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }

      if (student.role !== 'student') {
        return res.status(400).json({
          success: false,
          message: 'Can only adjust gems for student accounts',
        });
      }

      // Get current gem balance
      const { data: currentBalance, error: balanceError } = await supabase
        .rpc('get_student_gem_balance', { student_id: validatedData.studentId });

      if (balanceError) {
        throw new Error(`Failed to get current balance: ${balanceError.message}`);
      }

      const currentGems = currentBalance || 0;

      // Calculate new balance based on adjustment type
      let newBalance: number;
      let transactionAmount: number;

      switch (validatedData.adjustmentType) {
        case 'add':
          newBalance = currentGems + validatedData.amount;
          transactionAmount = validatedData.amount;
          break;
        case 'subtract':
          newBalance = currentGems - validatedData.amount;
          transactionAmount = -validatedData.amount;
          break;
        case 'set':
          newBalance = validatedData.amount;
          transactionAmount = validatedData.amount - currentGems;
          break;
      }

      // Validate new balance is not negative
      if (newBalance < 0) {
        return res.status(400).json({
          success: false,
          message: 'Adjustment would result in negative balance',
          currentBalance: currentGems,
          attemptedBalance: newBalance,
        });
      }

      // Create gem transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from('gem_transactions')
        .insert({
          student_id: validatedData.studentId,
          amount: transactionAmount,
          transaction_type: 'admin_adjustment',
          reason: validatedData.reason,
          related_admin_id: adminUserId,
          metadata: {
            adjustment_type: validatedData.adjustmentType,
            original_amount: validatedData.amount,
            previous_balance: currentGems,
            new_balance: newBalance,
            notes: validatedData.notes,
          },
        })
        .select()
        .single();

      if (transactionError) {
        throw new Error(`Failed to create transaction: ${transactionError.message}`);
      }

      // Log to audit service
      await gemsAuditService.logAdjustment({
        transactionId: transaction.id,
        adminId: adminUserId,
        studentId: validatedData.studentId,
        studentName: student.display_name,
        adjustmentType: validatedData.adjustmentType,
        amount: validatedData.amount,
        transactionAmount,
        previousBalance: currentGems,
        newBalance,
        reason: validatedData.reason,
        notes: validatedData.notes,
      });

      // Return success response
      return res.status(200).json({
        success: true,
        message: 'Gems adjusted successfully',
        data: {
          transactionId: transaction.id,
          studentId: validatedData.studentId,
          studentName: student.display_name,
          adjustmentType: validatedData.adjustmentType,
          amount: validatedData.amount,
          previousBalance: currentGems,
          newBalance,
          reason: validatedData.reason,
          timestamp: transaction.created_at,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      console.error('Gem adjustment error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/admin/gems/history/:studentId
 * Get gem transaction history for a student (admin only)
 */
router.get(
  '/history/:studentId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.params;
      const { limit = '50', offset = '0' } = req.query;

      // Verify admin authentication
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Verify admin role
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', adminUserId)
        .single();

      if (adminProfile?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden - admin role required',
        });
      }

      // Get transaction history
      const { data: transactions, error, count } = await supabase
        .from('gem_transactions')
        .select('*', { count: 'exact' })
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

      if (error) {
        throw new Error(`Failed to fetch transactions: ${error.message}`);
      }

      return res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            total: count || 0,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
          },
        },
      });
    } catch (error) {
      console.error('Gem history error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
);

export default router;
