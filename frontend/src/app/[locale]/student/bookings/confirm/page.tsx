export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle, Calendar, Clock, User, Gem, ArrowRight, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Booking Confirmed | Easy English',
  description: 'Your class booking has been confirmed',
};

interface ConfirmationPageProps {
  searchParams: {
    booking_id?: string;
  };
}

export default async function BookingConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const { booking_id } = searchParams;

  // Fetch booking from Supabase
  let booking = {
    id: booking_id || '',
    class: {
      id: '',
      title: 'Class',
      teacher_name: 'Teacher',
      scheduled_at: new Date(),
      duration: 25,
    },
    payment: {
      original_price: 0,
      gems_used: 0,
      discount_amount: 0,
      final_price: 0,
    },
    confirmation_code: 'EC' + (booking_id?.slice(0, 6) || '000000').toUpperCase(),
    booking_date: new Date(),
  };

  if (booking_id) {
    try {
      const supabase = await createClient();
      const { data } = await (supabase as any)
        .from('bookings')
        .select('*, classes(id, title, start_time, duration_minutes, profiles!classes_teacher_id_profiles_fkey(full_name))')
        .eq('id', booking_id)
        .single();

      if (data) {
        const cls = data.classes as Record<string, unknown> | undefined;
        const teacher = cls?.profiles as Record<string, unknown> | undefined;
        booking = {
          id: data.id,
          class: {
            id: (cls?.id as string) || '',
            title: (cls?.title as string) || 'Class',
            teacher_name: (teacher?.full_name as string) || 'Teacher',
            scheduled_at: new Date((cls?.start_time as string) || Date.now()),
            duration: (cls?.duration_minutes as number) || 25,
          },
          payment: {
            original_price: Number(data.original_price) || 0,
            gems_used: data.gems_used || 0,
            discount_amount: Number(data.gems_discount_amount) || 0,
            final_price: Number(data.final_price) || 0,
          },
          confirmation_code: 'EC' + data.id.slice(0, 6).toUpperCase(),
          booking_date: new Date(data.created_at),
        };
      }
    } catch (err) {
      console.error('Error fetching booking:', err);
    }
  }

  const savings = booking.payment.discount_amount;
  const savingsPercentage = (
    (savings / booking.payment.original_price) *
    100
  ).toFixed(0);

  return (
    <div className="container mx-auto py-12 px-4 max-w-3xl">
      {/* Success Icon */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-4">
          <CheckCircle className="h-12 w-12 text-green-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Booking Confirmed!</h1>
        <p className="text-gray-400">
          Your class has been successfully booked. We've sent a confirmation email to your
          inbox.
        </p>
      </div>

      {/* Confirmation Details */}
      <Card className="mb-6">
        <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Booking Details</CardTitle>
            <div className="text-sm text-gray-400">
              Confirmation: <span className="font-mono font-semibold text-purple-400">{booking.confirmation_code}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Class Info */}
          <div>
            <h3 className="font-semibold text-xl mb-4">{booking.class.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">Teacher</div>
                  <div className="font-medium">{booking.class.teacher_name}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">Date</div>
                  <div className="font-medium">
                    {booking.class.scheduled_at.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">Time</div>
                  <div className="font-medium">
                    {booking.class.scheduled_at.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">Duration</div>
                  <div className="font-medium">{booking.class.duration} minutes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="pt-6 border-t border-gray-700/50">
            <h4 className="font-semibold mb-4">Payment Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Original Price</span>
                <span className="font-medium">${booking.payment.original_price.toFixed(2)}</span>
              </div>

              {booking.payment.gems_used > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Gem className="h-4 w-4 text-purple-400" />
                      Gems Used ({booking.payment.gems_used} gems)
                    </span>
                    <span className="text-purple-400 font-medium">
                      -${booking.payment.discount_amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-400 font-medium">
                        You saved {savingsPercentage}%
                      </span>
                      <span className="text-lg font-bold text-green-400">
                        ${savings.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-between pt-3 border-t border-gray-700/50">
                <span className="font-semibold">Total Paid</span>
                <span className="text-2xl font-bold text-green-400">
                  ${booking.payment.final_price.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">What's Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">1</span>
              </div>
              <div>
                <div className="font-medium">Check Your Email</div>
                <div className="text-sm text-gray-400">
                  We've sent a confirmation email with your class details and meeting link.
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">2</span>
              </div>
              <div>
                <div className="font-medium">Prepare for Class</div>
                <div className="text-sm text-gray-400">
                  Test your microphone and camera. Find a quiet space with good internet.
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">3</span>
              </div>
              <div>
                <div className="font-medium">Join Your Class</div>
                <div className="text-sm text-gray-400">
                  You'll receive a reminder 15 minutes before class starts. Click the join
                  button in your email or dashboard.
                </div>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/student/dashboard" className="flex-1">
          <Button variant="outline" className="w-full flex items-center justify-center gap-2">
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </Link>
        <Link href={`/student/bookings/${booking.id}`} className="flex-1">
          <Button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            View Booking Details
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Cancellation Policy */}
      <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <h4 className="font-semibold text-yellow-400 mb-2">Cancellation Policy</h4>
        <p className="text-sm text-gray-400">
          You can cancel this booking up to 24 hours before the class starts for a full
          refund. Cancellations made less than 24 hours before will receive a 50% refund.
        </p>
      </div>
    </div>
  );
}
