'use client';

import { useState, useEffect } from 'react';
import { GemImage } from '@/components/common/GemImage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, AlertCircle, Settings, TrendingUp, Award } from 'lucide-react';
import GemRuleEditor from '@/components/admin/GemRuleEditor';

interface GemRule {
  id: string;
  activity_type: string;
  gem_reward: number;
  conditions?: Record<string, any>;
  is_active: boolean;
  rate_limit?: {
    max_per_day?: number;
    max_per_week?: number;
    max_per_month?: number;
  };
  created_at?: string;
  updated_at?: string;
}

interface GemRulesStats {
  totalRules: number;
  activeRules: number;
  totalGemsIssued: number;
  averageReward: number;
}

export default function GemsRulesPage() {
  const [rules, setRules] = useState<GemRule[]>([]);
  const [stats, setStats] = useState<GemRulesStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<GemRule | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    fetchRules();
    fetchStats();
  }, []);

  const fetchRules = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/gems-rules');

      if (!response.ok) {
        throw new Error('Failed to fetch gem rules');
      }

      const data = await response.json();
      setRules(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gem rules');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/gems-rules/stats');

      if (!response.ok) {
        return; // Stats are optional
      }

      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleCreateNew = () => {
    setEditingRule(null);
    setIsCreatingNew(true);
  };

  const handleEdit = (rule: GemRule) => {
    setEditingRule(rule);
    setIsCreatingNew(true);
  };

  const handleClose = () => {
    setEditingRule(null);
    setIsCreatingNew(false);
  };

  const handleSuccess = () => {
    fetchRules();
    fetchStats();
    handleClose();
  };

  const getActivityTypeLabel = (activityType: string): string => {
    const labels: Record<string, string> = {
      lesson_completion: 'Lesson Completion',
      attendance_streak: 'Attendance Streak',
      referral: 'Referral',
      profile_completion: 'Profile Completion',
      first_review: 'First Review',
      daily_login: 'Daily Login',
      quiz_completion: 'Quiz Completion',
      manual_award: 'Manual Award',
    };
    return labels[activityType] || activityType;
  };

  const formatRateLimit = (rateLimit?: GemRule['rate_limit']): string => {
    if (!rateLimit) return 'No limit';

    const limits: string[] = [];
    if (rateLimit.max_per_day) limits.push(`${rateLimit.max_per_day}/day`);
    if (rateLimit.max_per_week) limits.push(`${rateLimit.max_per_week}/week`);
    if (rateLimit.max_per_month) limits.push(`${rateLimit.max_per_month}/month`);

    return limits.length > 0 ? limits.join(', ') : 'No limit';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gem Earning Rules</h1>
          <p className="text-muted-foreground mt-1">
            Configure how students earn gems for various activities
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRules}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeRules}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gems Issued</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGemsIssued.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Reward</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-1">{Math.round(stats.averageReward)} <GemImage size={20} /></div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Earning Rules</CardTitle>
          <CardDescription>
            Manage gem rewards for different activities and achievements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No gem rules configured</h3>
              <p className="text-muted-foreground mb-4">
                Create your first gem earning rule to get started
              </p>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">
                        {getActivityTypeLabel(rule.activity_type)}
                      </h3>
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Reward:</span>{' '}
                        <span className="font-medium inline-flex items-center gap-1">{rule.gem_reward} <GemImage size={14} /></span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rate Limit:</span>{' '}
                        <span className="font-medium">{formatRateLimit(rule.rate_limit)}</span>
                      </div>
                    </div>

                    {rule.conditions && Object.keys(rule.conditions).length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Conditions:</span>{' '}
                        <code className="bg-muted px-2 py-1 rounded text-xs">
                          {JSON.stringify(rule.conditions)}
                        </code>
                      </div>
                    )}

                    {rule.updated_at && (
                      <div className="text-xs text-muted-foreground">
                        Last updated: {new Date(rule.updated_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(rule)}
                  >
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rule Editor Modal */}
      {isCreatingNew && (
        <GemRuleEditor
          isOpen={isCreatingNew}
          onClose={handleClose}
          rule={editingRule || undefined}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
