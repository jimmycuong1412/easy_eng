'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, Share2, Gift, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { GemImage } from '@/components/common/GemImage';

interface ReferralData {
  referral_code: string;
  referral_url: string;
  stats: {
    total_referrals: number;
    total_gems_earned: number;
  };
}

export default function ReferralLink() {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchReferralCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReferralCode = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError('You must be logged in to view your referral code');
        return;
      }

      // Call Edge Function to generate/retrieve referral code
      const response = await fetch('/api/supabase/generate-referral-code', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch referral code');
      }

      const data = await response.json();
      setReferralData(data);
    } catch (err) {
      console.error('Error fetching referral code:', err);
      setError(err instanceof Error ? err.message : 'Failed to load referral code');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareReferral = async () => {
    if (!referralData) return;

    const shareData = {
      title: 'Join me on Easy English!',
      text: `Use my referral code ${referralData.referral_code} to get started with English learning!`,
      url: referralData.referral_url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying link
        await copyToClipboard(referralData.referral_url);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!referralData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Refer Friends & Earn Gems
        </CardTitle>
        <CardDescription>
          Share your referral code and earn 200 gems when your friend completes their first class!
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Referral Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-primary/10 p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {referralData.stats.total_referrals}
            </div>
            <div className="text-sm text-muted-foreground">Total Referrals</div>
          </div>
          <div className="rounded-lg bg-green-500/10 p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {referralData.stats.total_gems_earned} <GemImage size={14} className="inline-block align-middle" />
            </div>
            <div className="text-sm text-muted-foreground">Gems Earned</div>
          </div>
        </div>

        {/* Referral Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Referral Code</label>
          <div className="flex gap-2">
            <Input
              value={referralData.referral_code}
              readOnly
              className="font-mono text-lg font-bold"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(referralData.referral_code)}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Referral URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Share Link</label>
          <div className="flex gap-2">
            <Input
              value={referralData.referral_url}
              readOnly
              className="text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(referralData.referral_url)}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Share Button */}
        <Button onClick={shareReferral} className="w-full gap-2">
          <Share2 className="h-4 w-4" />
          Share with Friends
        </Button>

        {/* How it Works */}
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="font-semibold text-sm">How it works:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Share your unique referral code or link with friends</li>
            <li>Your friend signs up using your code</li>
            <li>You earn 200 gems when they complete their first class!</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-2">
            Maximum 5 referrals per month. Terms apply.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
