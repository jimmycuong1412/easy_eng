/**
 * Gems API Routes
 * 
 * Endpoints for Gems balance and transaction history
 */

import { Router, Request, Response } from 'express';
import {
  getGemsBalance,
  getGemsBalanceDetails,
  getTransactionHistory,
  grantGems,
} from '../services/gems.service';
import { body, query, validationResult } from 'express-validator';

const router = Router();

/**
 * GET /api/gems/balance
 * Get user's current Gems balance
 */
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const balance = await getGemsBalance(userId);

    return res.status(200).json({
      success: true,
      data: {
        userId,
        balance,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get Gems balance';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/gems/balance/details
 * Get detailed balance information with stats
 */
router.get('/balance/details', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const details = await getGemsBalanceDetails(userId);

    return res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get balance details';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/gems/transactions
 * Get transaction history
 */
router.get(
  '/transactions',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('transactionType').optional().isString(),
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

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const transactionType = req.query.transactionType as string | undefined;

      const result = await getTransactionHistory({
        userId,
        limit,
        offset,
        transactionType,
      });

      return res.status(200).json({
        success: true,
        data: result.transactions,
        pagination: {
          limit,
          offset,
          total: result.total,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get transaction history';
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * POST /api/gems/grant
 * Grant Gems to a user (admin only)
 */
router.post(
  '/grant',
  [
    body('userId').isUUID().withMessage('Valid user ID is required'),
    body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
    body('reason').isString().notEmpty().withMessage('Reason is required'),
    body('metadata').optional().isObject(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const adminId = req.user?.id;
      const adminRole = req.user?.role;

      if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (adminRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { userId, amount, reason, metadata } = req.body;

      const transaction = await grantGems({
        userId,
        amount,
        grantedBy: adminId,
        reason,
        metadata,
      });

      return res.status(201).json({
        success: true,
        data: transaction,
        message: `Granted ${amount} Gems to user`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to grant Gems';
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

export default router;
