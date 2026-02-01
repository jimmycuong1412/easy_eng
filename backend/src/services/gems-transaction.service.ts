/**
 * Gems Transaction Logger Service
 *
 * Provides comprehensive transaction logging, audit trails, and reconciliation
 * for the Gems virtual currency system.
 *
 * Critical for financial accuracy, fraud prevention, and regulatory compliance.
 */

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface TransactionLogEntry {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  booking_id: string | null;
  class_id: string | null;
  metadata: Record<string, any>;
  granted_by: string | null;
  created_at: string;
  balance_before: number;
  balance_after: number;
}

export interface TransactionAudit {
  user_id: string;
  total_earned: number;
  total_spent: number;
  current_balance: number;
  transaction_count: number;
  first_transaction: string | null;
  last_transaction: string | null;
  discrepancies: AuditDiscrepancy[];
}

export interface AuditDiscrepancy {
  type: 'negative_balance' | 'missing_transaction' | 'duplicate' | 'balance_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  transaction_id?: string;
  detected_at: string;
}

export interface ReconciliationReport {
  timestamp: string;
  total_users_checked: number;
  users_with_discrepancies: number;
  total_discrepancies: number;
  discrepancies_by_type: Record<string, number>;
  affected_users: string[];
}

/**
 * Log a Gems transaction with full audit trail
 */
export async function logTransaction(params: {
  userId: string;
  amount: number;
  transactionType: string;
  description?: string;
  bookingId?: string;
  classId?: string;
  metadata?: Record<string, any>;
  grantedBy?: string;
}): Promise<TransactionLogEntry> {
  const {
    userId,
    amount,
    transactionType,
    description,
    bookingId,
    classId,
    metadata = {},
    grantedBy,
  } = params;

  try {
    // Get balance before transaction
    const { data: balanceBefore } = await supabase
      .rpc('get_gems_balance', { p_user_id: userId });

    // Insert transaction
    const { data: transaction, error } = await supabase
      .from('gem_transactions')
      .insert({
        user_id: userId,
        amount,
        transaction_type: transactionType,
        description: description || null,
        booking_id: bookingId || null,
        class_id: classId || null,
        metadata: {
          ...metadata,
          balance_before: balanceBefore || 0,
          logged_at: new Date().toISOString(),
        },
        granted_by: grantedBy || null,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to log Gems transaction', {
        userId,
        amount,
        transactionType,
        error: error.message,
      });
      throw new Error(`Failed to log transaction: ${error.message}`);
    }

    // Get balance after transaction
    const { data: balanceAfter } = await supabase
      .rpc('get_gems_balance', { p_user_id: userId });

    const logEntry: TransactionLogEntry = {
      ...transaction,
      balance_before: balanceBefore || 0,
      balance_after: balanceAfter || 0,
    };

    // Log to application logger
    logger.info('Gems transaction logged', {
      userId,
      transactionId: transaction.id,
      amount,
      transactionType,
      balanceBefore: balanceBefore || 0,
      balanceAfter: balanceAfter || 0,
    });

    return logEntry;
  } catch (error) {
    logger.error('Transaction logging failed', { userId, amount, error });
    throw error;
  }
}

/**
 * Get transaction audit trail for a user
 */
export async function getUserTransactionAudit(userId: string): Promise<TransactionAudit> {
  try {
    // Get all transactions
    const { data: transactions, error: txError } = await supabase
      .from('gem_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (txError) {
      throw new Error(`Failed to fetch transactions: ${txError.message}`);
    }

    if (!transactions || transactions.length === 0) {
      return {
        user_id: userId,
        total_earned: 0,
        total_spent: 0,
        current_balance: 0,
        transaction_count: 0,
        first_transaction: null,
        last_transaction: null,
        discrepancies: [],
      };
    }

    // Calculate totals
    const totalEarned = transactions
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalSpent = Math.abs(
      transactions
        .filter((tx) => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0)
    );

    // Get current balance
    const { data: currentBalance } = await supabase
      .rpc('get_gems_balance', { p_user_id: userId });

    // Check for discrepancies
    const discrepancies = await detectDiscrepancies(userId, transactions);

    return {
      user_id: userId,
      total_earned: totalEarned,
      total_spent: totalSpent,
      current_balance: currentBalance || 0,
      transaction_count: transactions.length,
      first_transaction: transactions[0].created_at,
      last_transaction: transactions[transactions.length - 1].created_at,
      discrepancies,
    };
  } catch (error) {
    logger.error('Failed to generate audit trail', { userId, error });
    throw error;
  }
}

/**
 * Detect discrepancies in transaction history
 */
async function detectDiscrepancies(
  userId: string,
  transactions: any[]
): Promise<AuditDiscrepancy[]> {
  const discrepancies: AuditDiscrepancy[] = [];

  // Check for negative balances
  let runningBalance = 0;
  for (const tx of transactions) {
    runningBalance += tx.amount;
    if (runningBalance < 0) {
      discrepancies.push({
        type: 'negative_balance',
        severity: 'critical',
        description: `Negative balance detected: ${runningBalance} Gems after transaction ${tx.id}`,
        transaction_id: tx.id,
        detected_at: new Date().toISOString(),
      });
    }
  }

  // Check for duplicate transactions (same amount, type, time within 1 second)
  for (let i = 0; i < transactions.length - 1; i++) {
    const tx1 = transactions[i];
    const tx2 = transactions[i + 1];

    const timeDiff = Math.abs(
      new Date(tx2.created_at).getTime() - new Date(tx1.created_at).getTime()
    );

    if (
      tx1.amount === tx2.amount &&
      tx1.transaction_type === tx2.transaction_type &&
      timeDiff < 1000
    ) {
      discrepancies.push({
        type: 'duplicate',
        severity: 'high',
        description: `Potential duplicate transaction: ${tx1.amount} Gems, type: ${tx1.transaction_type}`,
        transaction_id: tx2.id,
        detected_at: new Date().toISOString(),
      });
    }
  }

  // Check balance consistency
  const calculatedBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const { data: actualBalance } = await supabase
    .rpc('get_gems_balance', { p_user_id: userId });

  if (Math.abs(calculatedBalance - (actualBalance || 0)) > 0.01) {
    discrepancies.push({
      type: 'balance_mismatch',
      severity: 'critical',
      description: `Balance mismatch: calculated ${calculatedBalance}, actual ${actualBalance || 0}`,
      detected_at: new Date().toISOString(),
    });
  }

  return discrepancies;
}

/**
 * Perform system-wide Gems balance reconciliation
 */
export async function reconcileAllBalances(): Promise<ReconciliationReport> {
  try {
    logger.info('Starting Gems balance reconciliation');

    // Get all users with Gems transactions
    const { data: users, error: usersError } = await supabase
      .from('gem_transactions')
      .select('user_id')
      .order('user_id');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(users?.map((u) => u.user_id) || [])];

    const report: ReconciliationReport = {
      timestamp: new Date().toISOString(),
      total_users_checked: uniqueUserIds.length,
      users_with_discrepancies: 0,
      total_discrepancies: 0,
      discrepancies_by_type: {},
      affected_users: [],
    };

    // Check each user
    for (const userId of uniqueUserIds) {
      const audit = await getUserTransactionAudit(userId);

      if (audit.discrepancies.length > 0) {
        report.users_with_discrepancies++;
        report.total_discrepancies += audit.discrepancies.length;
        report.affected_users.push(userId);

        // Count by type
        for (const disc of audit.discrepancies) {
          report.discrepancies_by_type[disc.type] =
            (report.discrepancies_by_type[disc.type] || 0) + 1;
        }

        // Log critical discrepancies
        const criticalDiscrepancies = audit.discrepancies.filter(
          (d) => d.severity === 'critical'
        );
        if (criticalDiscrepancies.length > 0) {
          logger.error('Critical Gems discrepancy detected', {
            userId,
            discrepancies: criticalDiscrepancies,
          });
        }
      }
    }

    logger.info('Gems reconciliation complete', {
      totalUsers: report.total_users_checked,
      usersWithIssues: report.users_with_discrepancies,
      totalDiscrepancies: report.total_discrepancies,
    });

    return report;
  } catch (error) {
    logger.error('Reconciliation failed', { error });
    throw error;
  }
}

/**
 * Get transaction statistics for a date range
 */
export async function getTransactionStatistics(params: {
  startDate: string;
  endDate: string;
  transactionType?: string;
}): Promise<{
  total_transactions: number;
  total_gems_earned: number;
  total_gems_spent: number;
  net_gems_change: number;
  unique_users: number;
  transactions_by_type: Record<string, number>;
}> {
  const { startDate, endDate, transactionType } = params;

  try {
    let query = supabase
      .from('gem_transactions')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (transactionType) {
      query = query.eq('transaction_type', transactionType);
    }

    const { data: transactions, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch statistics: ${error.message}`);
    }

    if (!transactions || transactions.length === 0) {
      return {
        total_transactions: 0,
        total_gems_earned: 0,
        total_gems_spent: 0,
        net_gems_change: 0,
        unique_users: 0,
        transactions_by_type: {},
      };
    }

    const totalEarned = transactions
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalSpent = Math.abs(
      transactions
        .filter((tx) => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0)
    );

    const uniqueUsers = new Set(transactions.map((tx) => tx.user_id)).size;

    const transactionsByType = transactions.reduce((acc, tx) => {
      acc[tx.transaction_type] = (acc[tx.transaction_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_transactions: transactions.length,
      total_gems_earned: totalEarned,
      total_gems_spent: totalSpent,
      net_gems_change: totalEarned - totalSpent,
      unique_users: uniqueUsers,
      transactions_by_type: transactionsByType,
    };
  } catch (error) {
    logger.error('Failed to generate statistics', { startDate, endDate, error });
    throw error;
  }
}

/**
 * Export transaction history for a user (CSV format)
 */
export async function exportUserTransactions(
  userId: string,
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  try {
    const { data: transactions, error } = await supabase
      .from('gem_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to export transactions: ${error.message}`);
    }

    if (!transactions || transactions.length === 0) {
      return format === 'json' ? '[]' : 'No transactions found';
    }

    if (format === 'json') {
      return JSON.stringify(transactions, null, 2);
    }

    // CSV format
    const headers = [
      'Date',
      'Transaction ID',
      'Amount',
      'Type',
      'Description',
      'Booking ID',
      'Class ID',
    ];

    const rows = transactions.map((tx) => [
      tx.created_at,
      tx.id,
      tx.amount,
      tx.transaction_type,
      tx.description || '',
      tx.booking_id || '',
      tx.class_id || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  } catch (error) {
    logger.error('Failed to export transactions', { userId, format, error });
    throw error;
  }
}
