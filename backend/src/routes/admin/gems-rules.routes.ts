import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { gemsAuditService } from '../../services/gems-audit.service';

const router = Router();

// Validation schema for gem rule
const gemRuleSchema = z.object({
  activity_type: z.enum([
    'lesson_completion',
    'attendance_streak',
    'referral',
    'profile_completion',
    'first_review',
    'daily_login',
    'quiz_completion',
    'manual_award',
  ]),
  gem_reward: z.number().int().min(1).max(1000, 'Gem reward cannot exceed 1000'),
  conditions: z.record(z.any()).optional(),
  is_active: z.boolean().default(true),
  rate_limit: z.object({
    max_per_day: z.number().int().min(0).optional(),
    max_per_week: z.number().int().min(0).optional(),
    max_per_month: z.number().int().min(0).optional(),
  }).optional(),
});

type GemRuleRequest = z.infer<typeof gemRuleSchema>;

/**
 * Middleware to verify admin authentication and role
 */
async function verifyAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - admin authentication required',
      });
    }

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

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication verification failed',
    });
  }
}

/**
 * GET /api/admin/gems-rules
 * List all gem earning rules
 */
router.get(
  '/',
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: rules, error } = await supabase
        .from('gem_earning_rules')
        .select('*')
        .order('activity_type', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch gem rules: ${error.message}`);
      }

      return res.status(200).json({
        success: true,
        data: rules || [],
      });
    } catch (error) {
      console.error('Gem rules fetch error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/admin/gems-rules/stats
 * Get statistics about gem rules and usage
 */
router.get(
  '/stats',
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Get total and active rules count
      const { data: allRules, error: rulesError } = await supabase
        .from('gem_earning_rules')
        .select('gem_reward, is_active');

      if (rulesError) {
        throw new Error(`Failed to fetch rules: ${rulesError.message}`);
      }

      const totalRules = allRules?.length || 0;
      const activeRules = allRules?.filter(r => r.is_active).length || 0;
      const averageReward = totalRules > 0
        ? allRules.reduce((sum, r) => sum + r.gem_reward, 0) / totalRules
        : 0;

      // Get total gems issued from transactions
      const { data: transactions, error: txError } = await supabase
        .from('gem_transactions')
        .select('amount')
        .in('transaction_type', ['earned', 'awarded', 'bonus']);

      if (txError) {
        console.warn('Failed to fetch transaction stats:', txError.message);
      }

      const totalGemsIssued = transactions?.reduce((sum, tx) => sum + (tx.amount > 0 ? tx.amount : 0), 0) || 0;

      return res.status(200).json({
        success: true,
        data: {
          totalRules,
          activeRules,
          totalGemsIssued,
          averageReward,
        },
      });
    } catch (error) {
      console.error('Gem rules stats error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/admin/gems-rules
 * Create a new gem earning rule
 */
router.post(
  '/',
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = gemRuleSchema.parse(req.body);

      const adminUserId = req.user?.id!;

      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Check if rule for this activity type already exists
      const { data: existingRule, error: checkError } = await supabase
        .from('gem_earning_rules')
        .select('id')
        .eq('activity_type', validatedData.activity_type)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Failed to check existing rules: ${checkError.message}`);
      }

      if (existingRule) {
        return res.status(400).json({
          success: false,
          message: `A rule for ${validatedData.activity_type} already exists. Use PUT to update it.`,
        });
      }

      // Create new rule
      const { data: newRule, error: createError } = await supabase
        .from('gem_earning_rules')
        .insert({
          activity_type: validatedData.activity_type,
          gem_reward: validatedData.gem_reward,
          conditions: validatedData.conditions || null,
          is_active: validatedData.is_active,
          rate_limit: validatedData.rate_limit || null,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create rule: ${createError.message}`);
      }

      // Log to audit service
      await gemsAuditService.logRuleChange({
        adminId: adminUserId,
        ruleType: validatedData.activity_type,
        oldValue: null,
        newValue: validatedData,
        reason: 'New gem earning rule created',
      });

      return res.status(201).json({
        success: true,
        message: 'Gem rule created successfully',
        data: newRule,
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

      console.error('Gem rule creation error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * PUT /api/admin/gems-rules/:ruleId
 * Update an existing gem earning rule
 */
router.put(
  '/:ruleId',
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const { ruleId } = req.params;
      const validatedData = gemRuleSchema.partial().parse(req.body);

      const adminUserId = req.user?.id!;

      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Get existing rule
      const { data: existingRule, error: fetchError } = await supabase
        .from('gem_earning_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      if (fetchError || !existingRule) {
        return res.status(404).json({
          success: false,
          message: 'Gem rule not found',
        });
      }

      // Update rule
      const { data: updatedRule, error: updateError } = await supabase
        .from('gem_earning_rules')
        .update({
          gem_reward: validatedData.gem_reward ?? existingRule.gem_reward,
          conditions: validatedData.conditions !== undefined ? validatedData.conditions : existingRule.conditions,
          is_active: validatedData.is_active ?? existingRule.is_active,
          rate_limit: validatedData.rate_limit !== undefined ? validatedData.rate_limit : existingRule.rate_limit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ruleId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update rule: ${updateError.message}`);
      }

      // Log to audit service
      await gemsAuditService.logRuleChange({
        adminId: adminUserId,
        ruleType: existingRule.activity_type,
        oldValue: existingRule,
        newValue: updatedRule,
        reason: 'Gem earning rule updated',
      });

      return res.status(200).json({
        success: true,
        message: 'Gem rule updated successfully',
        data: updatedRule,
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

      console.error('Gem rule update error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * DELETE /api/admin/gems-rules/:ruleId
 * Delete a gem earning rule
 */
router.delete(
  '/:ruleId',
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const { ruleId } = req.params;
      const adminUserId = req.user?.id!;

      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Get existing rule for audit log
      const { data: existingRule, error: fetchError } = await supabase
        .from('gem_earning_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      if (fetchError || !existingRule) {
        return res.status(404).json({
          success: false,
          message: 'Gem rule not found',
        });
      }

      // Delete rule
      const { error: deleteError } = await supabase
        .from('gem_earning_rules')
        .delete()
        .eq('id', ruleId);

      if (deleteError) {
        throw new Error(`Failed to delete rule: ${deleteError.message}`);
      }

      // Log to audit service
      await gemsAuditService.logRuleChange({
        adminId: adminUserId,
        ruleType: existingRule.activity_type,
        oldValue: existingRule,
        newValue: null,
        reason: 'Gem earning rule deleted',
      });

      return res.status(200).json({
        success: true,
        message: 'Gem rule deleted successfully',
      });
    } catch (error) {
      console.error('Gem rule deletion error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
);

export default router;
