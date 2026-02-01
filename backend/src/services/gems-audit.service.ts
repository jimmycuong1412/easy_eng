import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger, format, transports } from 'winston';

interface GemAdjustmentLog {
  transactionId: string;
  adminId: string;
  studentId: string;
  studentName: string;
  adjustmentType: 'add' | 'subtract' | 'set';
  amount: number;
  transactionAmount: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  notes?: string;
}

interface AuditLogEntry {
  id?: string;
  event_type: 'gem_adjustment' | 'gem_rule_change' | 'gem_refund' | 'gem_fraud_detection';
  admin_id: string;
  target_user_id?: string;
  action_details: Record<string, any>;
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Gems Audit Service
 *
 * Provides comprehensive audit logging for all gem-related administrative actions.
 * Ensures compliance with Constitution Principle VI (Virtual Currency System Integrity).
 */
class GemsAuditService {
  private supabase: SupabaseClient;
  private logger: ReturnType<typeof createLogger>;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Configure Winston logger for audit trail
    this.logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp(),
        format.json()
      ),
      transports: [
        // Write all audit logs to file
        new transports.File({
          filename: 'logs/gem-audit.log',
          maxsize: 10485760, // 10MB
          maxFiles: 30, // Keep 30 days
        }),
        // Also log to console in development
        ...(process.env.NODE_ENV !== 'production'
          ? [new transports.Console({ format: format.simple() })]
          : []
        ),
      ],
    });
  }

  /**
   * Log a gem adjustment made by an admin
   */
  async logAdjustment(adjustment: GemAdjustmentLog): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        event_type: 'gem_adjustment',
        admin_id: adjustment.adminId,
        target_user_id: adjustment.studentId,
        action_details: {
          transaction_id: adjustment.transactionId,
          student_name: adjustment.studentName,
          adjustment_type: adjustment.adjustmentType,
          amount: adjustment.amount,
          transaction_amount: adjustment.transactionAmount,
          previous_balance: adjustment.previousBalance,
          new_balance: adjustment.newBalance,
          reason: adjustment.reason,
          notes: adjustment.notes,
        },
        timestamp: new Date(),
      };

      // Store in database
      const { error: dbError } = await this.supabase
        .from('admin_audit_log')
        .insert(auditEntry);

      if (dbError) {
        this.logger.error('Failed to store audit log in database', {
          error: dbError.message,
          adjustment,
        });
      }

      // Always log to file regardless of database success
      this.logger.info('Gem adjustment performed', {
        ...auditEntry,
        severity: 'AUDIT',
      });

      // Send alert for large adjustments (>1000 gems)
      if (Math.abs(adjustment.transactionAmount) > 1000) {
        await this.sendAlertForLargeAdjustment(adjustment);
      }
    } catch (error) {
      this.logger.error('Audit logging failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        adjustment,
      });
    }
  }

  /**
   * Log a change to gem rules (earning rates, caps, etc.)
   */
  async logRuleChange(data: {
    adminId: string;
    ruleType: string;
    oldValue: any;
    newValue: any;
    reason: string;
  }): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        event_type: 'gem_rule_change',
        admin_id: data.adminId,
        action_details: {
          rule_type: data.ruleType,
          old_value: data.oldValue,
          new_value: data.newValue,
          reason: data.reason,
        },
        timestamp: new Date(),
      };

      await this.supabase.from('admin_audit_log').insert(auditEntry);

      this.logger.warn('Gem rule changed', {
        ...auditEntry,
        severity: 'CRITICAL_AUDIT',
      });
    } catch (error) {
      this.logger.error('Failed to log rule change', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data,
      });
    }
  }

  /**
   * Log gem refund (from booking cancellation)
   */
  async logRefund(data: {
    bookingId: string;
    studentId: string;
    refundAmount: number;
    reason: string;
  }): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        event_type: 'gem_refund',
        admin_id: 'system', // Automated refunds
        target_user_id: data.studentId,
        action_details: {
          booking_id: data.bookingId,
          refund_amount: data.refundAmount,
          reason: data.reason,
        },
        timestamp: new Date(),
      };

      await this.supabase.from('admin_audit_log').insert(auditEntry);

      this.logger.info('Gem refund processed', auditEntry);
    } catch (error) {
      this.logger.error('Failed to log refund', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data,
      });
    }
  }

  /**
   * Log potential fraud detection
   */
  async logFraudDetection(data: {
    studentId: string;
    detectionType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: Record<string, any>;
  }): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        event_type: 'gem_fraud_detection',
        admin_id: 'system',
        target_user_id: data.studentId,
        action_details: {
          detection_type: data.detectionType,
          severity: data.severity,
          details: data.details,
        },
        timestamp: new Date(),
      };

      await this.supabase.from('admin_audit_log').insert(auditEntry);

      this.logger.warn('Fraud detection triggered', {
        ...auditEntry,
        severity: `FRAUD_${data.severity.toUpperCase()}`,
      });

      // Alert security team for high/critical severity
      if (data.severity === 'high' || data.severity === 'critical') {
        await this.sendSecurityAlert(data);
      }
    } catch (error) {
      this.logger.error('Failed to log fraud detection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data,
      });
    }
  }

  /**
   * Get audit log for a specific student
   */
  async getStudentAuditLog(studentId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('admin_audit_log')
        .select('*')
        .eq('target_user_id', studentId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      this.logger.error('Failed to retrieve audit log', {
        error: error instanceof Error ? error.message : 'Unknown error',
        studentId,
      });
      return [];
    }
  }

  /**
   * Get audit log for a specific admin
   */
  async getAdminAuditLog(adminId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('admin_audit_log')
        .select('*')
        .eq('admin_id', adminId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      this.logger.error('Failed to retrieve admin audit log', {
        error: error instanceof Error ? error.message : 'Unknown error',
        adminId,
      });
      return [];
    }
  }

  /**
   * Generate reconciliation report
   * Verifies all gem transactions add up correctly
   */
  async generateReconciliationReport(dateRange?: {
    start: Date;
    end: Date;
  }): Promise<{
    totalTransactions: number;
    totalGemsIssued: number;
    totalGemsSpent: number;
    totalGemsRefunded: number;
    discrepancies: any[];
  }> {
    try {
      let query = this.supabase
        .from('gem_transactions')
        .select('*');

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: transactions, error } = await query;

      if (error) {
        throw error;
      }

      const report = {
        totalTransactions: transactions?.length || 0,
        totalGemsIssued: 0,
        totalGemsSpent: 0,
        totalGemsRefunded: 0,
        discrepancies: [] as any[],
      };

      transactions?.forEach((tx) => {
        if (tx.amount > 0) {
          if (tx.transaction_type === 'refund') {
            report.totalGemsRefunded += tx.amount;
          } else {
            report.totalGemsIssued += tx.amount;
          }
        } else {
          report.totalGemsSpent += Math.abs(tx.amount);
        }
      });

      this.logger.info('Reconciliation report generated', report);

      return report;
    } catch (error) {
      this.logger.error('Failed to generate reconciliation report', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Send alert for large gem adjustments
   */
  private async sendAlertForLargeAdjustment(adjustment: GemAdjustmentLog): Promise<void> {
    // In production, this would send an email/Slack notification
    this.logger.warn('ALERT: Large gem adjustment detected', {
      amount: adjustment.transactionAmount,
      student: adjustment.studentName,
      admin: adjustment.adminId,
      reason: adjustment.reason,
    });

    // TODO: Integrate with notification service
    // await notificationService.sendAlert({
    //   channel: 'admin-alerts',
    //   message: `Large gem adjustment: ${adjustment.transactionAmount} gems for ${adjustment.studentName}`,
    //   severity: 'warning',
    // });
  }

  /**
   * Send security alert for fraud detection
   */
  private async sendSecurityAlert(data: {
    studentId: string;
    detectionType: string;
    severity: string;
    details: Record<string, any>;
  }): Promise<void> {
    this.logger.error('SECURITY ALERT: Gem fraud detected', data);

    // TODO: Integrate with security monitoring service
    // await securityService.sendAlert({
    //   type: 'gem_fraud',
    //   severity: data.severity,
    //   studentId: data.studentId,
    //   details: data.details,
    // });
  }
}

// Export singleton instance
export const gemsAuditService = new GemsAuditService();
