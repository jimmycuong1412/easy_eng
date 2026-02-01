'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { validateGemRule, GEM_CONSTRAINTS } from '@/utils/GemRuleValidation';

interface GemRule {
  id?: string;
  activity_type: string;
  gem_reward: number;
  conditions?: Record<string, any>;
  is_active: boolean;
  rate_limit?: {
    max_per_day?: number;
    max_per_week?: number;
    max_per_month?: number;
  };
}

interface GemRuleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  rule?: GemRule;
  onSuccess?: () => void;
}

const ACTIVITY_TYPES = [
  { value: 'lesson_completion', label: 'Lesson Completion', description: 'Awarded when a student completes a lesson' },
  { value: 'attendance_streak', label: 'Attendance Streak', description: 'Bonus for consecutive class attendance' },
  { value: 'referral', label: 'Referral', description: 'Earned when referring new students' },
  { value: 'profile_completion', label: 'Profile Completion', description: 'One-time reward for completing profile' },
  { value: 'first_review', label: 'First Review', description: 'Reward for leaving first class review' },
  { value: 'daily_login', label: 'Daily Login', description: 'Daily login bonus' },
  { value: 'quiz_completion', label: 'Quiz Completion', description: 'Awarded for completing quizzes' },
  { value: 'manual_award', label: 'Manual Award', description: 'Admin-initiated awards' },
];

export default function GemRuleEditor({
  isOpen,
  onClose,
  rule,
  onSuccess,
}: GemRuleEditorProps) {
  const isEditMode = !!rule?.id;

  const [activityType, setActivityType] = useState<string>(rule?.activity_type || '');
  const [gemReward, setGemReward] = useState<string>(rule?.gem_reward?.toString() || '');
  const [isActive, setIsActive] = useState<boolean>(rule?.is_active ?? true);
  const [conditions, setConditions] = useState<string>(
    rule?.conditions ? JSON.stringify(rule.conditions, null, 2) : '{}'
  );
  const [maxPerDay, setMaxPerDay] = useState<string>(rule?.rate_limit?.max_per_day?.toString() || '');
  const [maxPerWeek, setMaxPerWeek] = useState<string>(rule?.rate_limit?.max_per_week?.toString() || '');
  const [maxPerMonth, setMaxPerMonth] = useState<string>(rule?.rate_limit?.max_per_month?.toString() || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (rule) {
      setActivityType(rule.activity_type);
      setGemReward(rule.gem_reward.toString());
      setIsActive(rule.is_active);
      setConditions(rule.conditions ? JSON.stringify(rule.conditions, null, 2) : '{}');
      setMaxPerDay(rule.rate_limit?.max_per_day?.toString() || '');
      setMaxPerWeek(rule.rate_limit?.max_per_week?.toString() || '');
      setMaxPerMonth(rule.rate_limit?.max_per_month?.toString() || '');
    }
  }, [rule]);

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!activityType) {
      errors.push('Activity type is required');
    }

    const rewardNum = parseInt(gemReward);
    if (!gemReward || isNaN(rewardNum) || rewardNum < GEM_CONSTRAINTS.MIN_REWARD) {
      errors.push(`Gem reward must be at least ${GEM_CONSTRAINTS.MIN_REWARD}`);
    }
    if (rewardNum > GEM_CONSTRAINTS.MAX_REWARD) {
      errors.push(`Gem reward cannot exceed ${GEM_CONSTRAINTS.MAX_REWARD}`);
    }

    // Validate JSON conditions
    try {
      if (conditions.trim()) {
        JSON.parse(conditions);
      }
    } catch (e) {
      errors.push('Conditions must be valid JSON');
    }

    // Validate rate limits are positive
    if (maxPerDay && (isNaN(parseInt(maxPerDay)) || parseInt(maxPerDay) < 0)) {
      errors.push('Max per day must be a positive number');
    }
    if (maxPerWeek && (isNaN(parseInt(maxPerWeek)) || parseInt(maxPerWeek) < 0)) {
      errors.push('Max per week must be a positive number');
    }
    if (maxPerMonth && (isNaN(parseInt(maxPerMonth)) || parseInt(maxPerMonth) < 0)) {
      errors.push('Max per month must be a positive number');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const buildRuleObject = (): GemRule => {
    const ruleObj: GemRule = {
      activity_type: activityType,
      gem_reward: parseInt(gemReward),
      is_active: isActive,
    };

    // Add conditions if provided
    try {
      const conditionsObj = JSON.parse(conditions.trim() || '{}');
      if (Object.keys(conditionsObj).length > 0) {
        ruleObj.conditions = conditionsObj;
      }
    } catch (e) {
      // Already validated above
    }

    // Add rate limits if provided
    const rateLimit: GemRule['rate_limit'] = {};
    if (maxPerDay) rateLimit.max_per_day = parseInt(maxPerDay);
    if (maxPerWeek) rateLimit.max_per_week = parseInt(maxPerWeek);
    if (maxPerMonth) rateLimit.max_per_month = parseInt(maxPerMonth);

    if (Object.keys(rateLimit).length > 0) {
      ruleObj.rate_limit = rateLimit;
    }

    if (isEditMode && rule?.id) {
      ruleObj.id = rule.id;
    }

    return ruleObj;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setValidationErrors([]);

    if (!validateForm()) {
      return;
    }

    const ruleObj = buildRuleObject();

    // Validate with Zod schema
    const validation = validateGemRule(ruleObj);
    if (!validation.valid) {
      setValidationErrors(validation.errors || ['Validation failed']);
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditMode
        ? `/api/admin/gems-rules/${rule.id}`
        : '/api/admin/gems-rules';

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleObj),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save gem rule');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setActivityType('');
      setGemReward('');
      setIsActive(true);
      setConditions('{}');
      setMaxPerDay('');
      setMaxPerWeek('');
      setMaxPerMonth('');
      setError(null);
      setSuccess(false);
      setValidationErrors([]);
      onClose();
    }
  };

  const selectedActivity = ACTIVITY_TYPES.find(a => a.value === activityType);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Gem Earning Rule' : 'Create Gem Earning Rule'}
          </DialogTitle>
          <DialogDescription>
            Configure how students earn gems for specific activities
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Activity Type */}
          <div className="space-y-2">
            <Label htmlFor="activity-type">Activity Type</Label>
            <Select
              value={activityType}
              onValueChange={setActivityType}
              disabled={isEditMode} // Can't change activity type in edit mode
            >
              <SelectTrigger id="activity-type">
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedActivity && (
              <p className="text-xs text-muted-foreground">
                {selectedActivity.description}
              </p>
            )}
          </div>

          {/* Gem Reward */}
          <div className="space-y-2">
            <Label htmlFor="gem-reward">Gem Reward</Label>
            <Input
              id="gem-reward"
              type="number"
              min={GEM_CONSTRAINTS.MIN_REWARD}
              max={GEM_CONSTRAINTS.MAX_REWARD}
              step="1"
              value={gemReward}
              onChange={(e) => setGemReward(e.target.value)}
              placeholder={`${GEM_CONSTRAINTS.MIN_REWARD}-${GEM_CONSTRAINTS.MAX_REWARD} gems`}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Must be between {GEM_CONSTRAINTS.MIN_REWARD} and {GEM_CONSTRAINTS.MAX_REWARD} gems
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="is-active">Active Status</Label>
              <p className="text-xs text-muted-foreground">
                Inactive rules will not award gems
              </p>
            </div>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isSubmitting}
            />
          </div>

          {/* Rate Limits */}
          <div className="space-y-3">
            <Label>Rate Limits (Optional)</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="max-per-day" className="text-xs">
                  Max/Day
                </Label>
                <Input
                  id="max-per-day"
                  type="number"
                  min="0"
                  step="1"
                  value={maxPerDay}
                  onChange={(e) => setMaxPerDay(e.target.value)}
                  placeholder="Unlimited"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="max-per-week" className="text-xs">
                  Max/Week
                </Label>
                <Input
                  id="max-per-week"
                  type="number"
                  min="0"
                  step="1"
                  value={maxPerWeek}
                  onChange={(e) => setMaxPerWeek(e.target.value)}
                  placeholder="Unlimited"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="max-per-month" className="text-xs">
                  Max/Month
                </Label>
                <Input
                  id="max-per-month"
                  type="number"
                  min="0"
                  step="1"
                  value={maxPerMonth}
                  onChange={(e) => setMaxPerMonth(e.target.value)}
                  placeholder="Unlimited"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty for no rate limits
            </p>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <Label htmlFor="conditions">Conditions (JSON, Optional)</Label>
            <Textarea
              id="conditions"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder='{"min_streak": 3, "required_level": "intermediate"}'
              rows={4}
              disabled={isSubmitting}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Additional conditions for earning gems (must be valid JSON)
            </p>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Changes to gem rules are logged for audit purposes. All modifications will be tracked with your admin ID and timestamp.
            </AlertDescription>
          </Alert>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Gem rule {isEditMode ? 'updated' : 'created'} successfully! Closing modal...
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || success}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>{isEditMode ? 'Update Rule' : 'Create Rule'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
