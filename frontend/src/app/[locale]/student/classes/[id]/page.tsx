export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Clock, Users, Gem, ArrowLeft, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Class Details | Easy English',
  description: 'View class details and book your session',
};

interface ClassDetailPageProps {
  params: {
    id: string;
    locale: string;
  };
}

/**
 * Class Detail Page
 *
 * Displays comprehensive class information:
 * - Class title, description, level
 * - Teacher information
 * - Schedule, duration, capacity
 * - Pricing with Gems discount calculator
 * - Booking action
 */
export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { id } = params;

  const supabase = await createClient();
  const { data: rawClass, error } = await supabase
    .from('classes')
    .select('*, profiles!classes_teacher_id_profiles_fkey(id, full_name, avatar_url, bio, role)')
    .eq('id', id)
    .single();

  const cls = rawClass as Record<string, unknown> | null;
  const teacher = cls?.profiles as Record<string, unknown> | null;

  const classData = {
    id,
    title: (cls?.title as string) || 'Class',
    description: (cls?.description as string) || '',
    long_description: (cls?.description as string) || '',
    teacher: {
      id: (teacher?.id as string) || '',
      name: (teacher?.full_name as string) || 'Teacher',
      avatar: (teacher?.avatar_url as string) || '',
      bio: (teacher?.bio as string) || '',
      rating: 0,
      total_classes: 0,
    },
    level: (cls?.level as string) || 'Beginner',
    duration: (cls?.duration_minutes as number) || 25,
    price: (cls?.price as number) || 0,
    capacity: (cls?.max_students as number) || 5,
    enrolled: (cls?.current_enrollments as number) || 0,
    scheduled_at: new Date((cls?.start_time as string) || Date.now()),
    image_url: '',
    topics: ((cls?.tags as string[]) || []),
    requirements: [] as string[],
  };

  if (error) {
    console.error('Error fetching class:', error);
  }

  const availableSpots = classData.capacity - classData.enrolled;
  const isAvailable = availableSpots > 0;

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Back Button */}
      <Link
        href="/student/classes"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Classes
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Class Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                      {classData.level}
                    </span>
                    {!isAvailable && (
                      <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                        Full
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-2xl mb-2">{classData.title}</CardTitle>
                  <p className="text-gray-400 text-sm">{classData.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Class Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-purple-400" />
                  <div>
                    <div className="text-gray-400 text-xs">Date</div>
                    <div className="font-medium">
                      {classData.scheduled_at.toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-purple-400" />
                  <div>
                    <div className="text-gray-400 text-xs">Time</div>
                    <div className="font-medium">
                      {classData.scheduled_at.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-purple-400" />
                  <div>
                    <div className="text-gray-400 text-xs">Duration</div>
                    <div className="font-medium">{classData.duration} min</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-purple-400" />
                  <div>
                    <div className="text-gray-400 text-xs">Spots</div>
                    <div className="font-medium">
                      {availableSpots}/{classData.capacity}
                    </div>
                  </div>
                </div>
              </div>

              {/* Long Description */}
              <div>
                <h3 className="font-semibold mb-2">About This Class</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {classData.long_description}
                </p>
              </div>

              {/* Topics */}
              <div>
                <h3 className="font-semibold mb-2">Topics Covered</h3>
                <div className="flex flex-wrap gap-2">
                  {classData.topics.map((topic) => (
                    <span
                      key={topic}
                      className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="font-semibold mb-2">Requirements</h3>
                <ul className="space-y-1">
                  {classData.requirements.map((req) => (
                    <li key={req} className="text-gray-400 text-sm flex items-center gap-2">
                      <div className="w-1 h-1 bg-purple-400 rounded-full" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Teacher Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Teacher</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold">
                  {classData.teacher.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{classData.teacher.name}</h4>
                  <p className="text-gray-400 text-sm mb-2">{classData.teacher.bio}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <span className="font-medium">{classData.teacher.rating}</span>
                    </div>
                    <div className="text-gray-400">
                      {classData.teacher.total_classes.toLocaleString()} classes taught
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Booking Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Book This Class</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Price */}
              <div>
                <div className="text-3xl font-bold text-purple-400">
                  ${classData.price.toFixed(2)}
                </div>
                <div className="text-sm text-gray-400">per session</div>
              </div>

              {/* Gems Discount Placeholder */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gem className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-200">
                    Use Gems for Discount
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Save up to 50% by using your Gems (100 Gems = $1.00 off)
                </p>
              </div>

              {/* Book Button */}
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                disabled={!isAvailable}
              >
                {isAvailable ? (
                  <>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Book Now
                  </>
                ) : (
                  'Class Full'
                )}
              </Button>

              {/* Additional Info */}
              <div className="pt-4 border-t border-gray-700/50 space-y-2 text-xs text-gray-400">
                <p>• Instant confirmation</p>
                <p>• 24-hour cancellation policy</p>
                <p>• Full refund if cancelled by teacher</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
