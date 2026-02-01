'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Filter, Download, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface GemTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  reason: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface GemSummary {
  total_earned: number;
  total_spent: number;
  current_balance: number;
}

export default function GemHistoryPage() {
  const [transactions, setTransactions] = useState<GemTransaction[]>([]);
  const [summary, setSummary] = useState<GemSummary>({
    total_earned: 0,
    total_spent: 0,
    current_balance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all'); // all, earned, spent
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const supabase = createClient();
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchGemHistory();
    fetchGemSummary();
  }, [filter, page]);

  const fetchGemHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be logged in to view your gem history');
        return;
      }

      let query = supabase
        .from('gem_transactions')
        .select('*', { count: 'exact' })
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      // Apply filter
      if (filter === 'earned') {
        query = query.gt('amount', 0);
      } else if (filter === 'spent') {
        query = query.lt('amount', 0);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setTransactions(data || []);
      setHasMore(count ? count > page * ITEMS_PER_PAGE : false);
    } catch (err) {
      console.error('Error fetching gem history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load gem history');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGemSummary = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get current balance
      const { data: balance } = await supabase.rpc('get_student_gem_balance', {
        student_id: user.id,
      });

      // Calculate totals
      const { data: allTransactions } = await supabase
        .from('gem_transactions')
        .select('amount')
        .eq('student_id', user.id);

      const totalEarned = allTransactions
        ?.filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      const totalSpent = Math.abs(
        allTransactions
          ?.filter((t) => t.amount < 0)
          .reduce((sum, t) => sum + t.amount, 0) || 0
      );

      setSummary({
        total_earned: totalEarned,
        total_spent: totalSpent,
        current_balance: balance || 0,
      });
    } catch (err) {
      console.error('Error fetching gem summary:', err);
    }
  };

  const exportHistory = async () => {
    const csv = [
      ['Date', 'Type', 'Reason', 'Amount', 'Balance Change'],
      ...transactions.map((t) => [
        format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss'),
        t.transaction_type,
        t.reason,
        t.amount.toString(),
        t.amount > 0 ? `+${t.amount}` : t.amount.toString(),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gem-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getTransactionIcon = (amount: number) => {
    return amount > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getTransactionBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      earned: 'default',
      spent: 'secondary',
      refund: 'default',
      admin_adjustment: 'destructive',
    };

    return (
      <Badge variant={variants[type] || 'secondary'}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gem History</h1>
          <p className="text-muted-foreground mt-1">
            Track all your gem earnings and spending
          </p>
        </div>
        <Button onClick={exportHistory} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {summary.current_balance} 💎
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              +{summary.total_earned} 💎
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              -{summary.total_spent} 💎
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaction History</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="earned">Earned Only</SelectItem>
                  <SelectItem value="spent">Spent Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-6 w-[80px]" />
                </div>
              ))}
            </div>
          )}

          {/* Transactions List */}
          {!isLoading && !error && (
            <>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
                  <p className="text-muted-foreground">
                    Complete activities to start earning gems!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {getTransactionIcon(transaction.amount)}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{transaction.reason}</h4>
                            {getTransactionBadge(transaction.transaction_type)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-lg font-bold ${
                            transaction.amount > 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {transaction.amount > 0 ? '+' : ''}
                          {transaction.amount} 💎
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {transactions.length > 0 && (
                <div className="flex items-center justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">Page {page}</span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMore}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
