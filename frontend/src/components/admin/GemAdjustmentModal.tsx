'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface GemAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  currentBalance: number;
  onSuccess?: () => void;
}

type AdjustmentType = 'add' | 'subtract' | 'set';

interface AdjustmentData {
  studentId: string;
  adjustmentType: AdjustmentType;
  amount: number;
  reason: string;
  notes?: string;
}

export default function GemAdjustmentModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  currentBalance,
  onSuccess,
}: GemAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('add');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const calculateNewBalance = (): number => {
    const amountNum = parseInt(amount) || 0;
    switch (adjustmentType) {
      case 'add':
        return currentBalance + amountNum;
      case 'subtract':
        return currentBalance - amountNum;
      case 'set':
        return amountNum;
      default:
        return currentBalance;
    }
  };

  const newBalance = calculateNewBalance();
  const isNegativeBalance = newBalance < 0;

  const validateForm = (): string | null => {
    if (!amount || parseInt(amount) <= 0) {
      return 'Please enter a valid amount greater than 0';
    }

    if (!reason.trim()) {
      return 'Please provide a reason for this adjustment';
    }

    if (isNegativeBalance) {
      return 'Adjustment would result in negative balance. Please adjust the amount.';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const adjustmentData: AdjustmentData = {
        studentId,
        adjustmentType,
        amount: parseInt(amount),
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      };

      const response = await fetch('/api/admin/gems/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adjustmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to adjust gems');
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
      setAdjustmentType('add');
      setAmount('');
      setReason('');
      setNotes('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const commonReasons = [
    'Promotional bonus',
    'Referral reward',
    'Compensation for service issue',
    'Event participation reward',
    'Manual correction',
    'Penalty for violation',
    'Refund adjustment',
    'Other (specify in notes)',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust Gems Balance</DialogTitle>
          <DialogDescription>
            Modify gems for <span className="font-semibold">{studentName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Balance Display */}
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Current Balance
              </span>
              <span className="text-2xl font-bold">{currentBalance} 💎</span>
            </div>
          </div>

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label htmlFor="adjustment-type">Adjustment Type</Label>
            <Select
              value={adjustmentType}
              onValueChange={(value) => setAdjustmentType(value as AdjustmentType)}
            >
              <SelectTrigger id="adjustment-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Gems (+)</SelectItem>
                <SelectItem value="subtract">Subtract Gems (-)</SelectItem>
                <SelectItem value="set">Set Balance (=)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              {adjustmentType === 'set' ? 'New Balance' : 'Amount'}
            </Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={adjustmentType === 'set' ? 'Enter new balance' : 'Enter amount'}
              disabled={isSubmitting}
            />
          </div>

          {/* Preview New Balance */}
          {amount && (
            <div className={`rounded-lg p-4 ${isNegativeBalance ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  New Balance Preview
                </span>
                <span className={`text-xl font-bold ${isNegativeBalance ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {newBalance} 💎
                  {isNegativeBalance && ' ⚠️'}
                </span>
              </div>
              {isNegativeBalance && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  Warning: Negative balances are not allowed
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Required)</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {commonReasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide additional context or details..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

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
                Gems adjusted successfully! Closing modal...
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
              disabled={isSubmitting || isNegativeBalance || success}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Adjust Gems'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
