'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Star, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { GemImage } from '@/components/common/GemImage';

interface ReviewFormProps {
  bookingId: string;
  className?: string;
  onSuccess?: (reviewData: {
    review_id: string;
    is_first_review: boolean;
    gems_awarded: number;
  }) => void;
}

export default function ReviewForm({ bookingId, className, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [gemsAwarded, setGemsAwarded] = useState<number>(0);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate rating
    if (rating === 0) {
      setError('Please select a star rating');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('You must be logged in to submit a review');
      }

      // Call submit_review database function
      const { data, error: submitError } = await supabase.rpc('submit_review', {
        p_booking_id: bookingId,
        p_rating: rating,
        p_comment: comment.trim() || null,
        p_is_anonymous: isAnonymous,
      });

      if (submitError) {
        throw submitError;
      }

      const result = data[0];

      if (!result.success) {
        throw new Error(result.message);
      }

      setSuccess(true);
      setGemsAwarded(result.gems_awarded || 0);

      // Call success callback
      if (onSuccess) {
        onSuccess({
          review_id: result.review_id,
          is_first_review: result.is_first_review,
          gems_awarded: result.gems_awarded || 0,
        });
      }

      // Reset form after short delay
      setTimeout(() => {
        setRating(0);
        setComment('');
        setIsAnonymous(false);
      }, 2000);
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Leave a Review</CardTitle>
        <CardDescription>
          Share your experience and help other students find great classes
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Your Rating *</Label>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                    disabled={isSubmitting || success}
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <span className="text-sm font-medium text-muted-foreground">
                  {ratingLabels[rating - 1]}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Your Review (Optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you like about this class? What could be improved?"
              rows={4}
              maxLength={1000}
              disabled={isSubmitting || success}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Be specific and helpful to other students</span>
              <span>{comment.length}/1000</span>
            </div>
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
              disabled={isSubmitting || success}
            />
            <Label
              htmlFor="anonymous"
              className="text-sm font-normal cursor-pointer"
            >
              Post this review anonymously
            </Label>
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
                Review submitted successfully!
                {gemsAwarded > 0 && (
                  <span className="font-semibold ml-1">
                    You earned {gemsAwarded} gems! <GemImage size={16} className="inline-block align-middle" />
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={rating === 0 || isSubmitting || success}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Review Submitted
              </>
            ) : (
              'Submit Review'
            )}
          </Button>

          {/* Review Guidelines */}
          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold">Review Guidelines:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Be honest and constructive</li>
              <li>Focus on your experience in the class</li>
              <li>Avoid personal attacks or inappropriate language</li>
              <li>First review earns 50 bonus gems! <GemImage size={16} className="inline-block align-middle" /></li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
