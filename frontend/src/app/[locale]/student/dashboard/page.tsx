import { Metadata } from 'next';
import { GemBalanceWidget } from '@/components/dashboard/GemBalanceWidget';
import { UpcomingClassesWidget } from '@/components/dashboard/UpcomingClassesWidget';
import { BookOpen, TrendingUp, Award, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Student Dashboard | Easy English',
  description: 'View your classes, gems balance, and learning progress',
};

/**
 * Student Dashboard Page
 *
 * Main dashboard for students with:
 * - Gem balance widget
 * - Upcoming classes
 * - Quick stats
 * - Quick actions
 */
export default function StudentDashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back! 👋
        </h1>
        <p className="text-gray-400">
          Here's your learning dashboard
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Widgets */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Classes */}
          <UpcomingClassesWidget />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">
                  Classes Completed
                </CardTitle>
                <BookOpen className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-300">12</div>
                <p className="text-xs text-blue-400 mt-1">
                  +2 this week
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-500/10 border-green-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-100">
                  Learning Streak
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-300">7 days</div>
                <p className="text-xs text-green-400 mt-1">
                  Keep it going! 🔥
                </p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-500/10 border-yellow-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-yellow-100">
                  Total Savings
                </CardTitle>
                <Award className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-300">$45.50</div>
                <p className="text-xs text-yellow-400 mt-1">
                  Using gems
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors border border-gray-700/50 hover:border-gray-600/50">
                  <BookOpen className="h-6 w-6 text-blue-400" />
                  <span className="text-sm font-medium">Browse Classes</span>
                </button>

                <button className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors border border-gray-700/50 hover:border-gray-600/50">
                  <Calendar className="h-6 w-6 text-green-400" />
                  <span className="text-sm font-medium">My Bookings</span>
                </button>

                <button className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors border border-gray-700/50 hover:border-gray-600/50">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                  <span className="text-sm font-medium">My Progress</span>
                </button>

                <button className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors border border-gray-700/50 hover:border-gray-600/50">
                  <Award className="h-6 w-6 text-yellow-400" />
                  <span className="text-sm font-medium">Rewards</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar Widgets */}
        <div className="space-y-6">
          {/* Gem Balance */}
          <GemBalanceWidget />

          {/* Learning Progress */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-700/10 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-blue-100">
                This Week's Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Classes Attended</span>
                    <span className="text-blue-300 font-semibold">2/3</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: '66%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Homework Completed</span>
                    <span className="text-blue-300 font-semibold">4/5</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: '80%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Study Time</span>
                    <span className="text-blue-300 font-semibold">5.5h / 6h</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: '92%' }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Card */}
          <Card className="bg-gradient-to-br from-orange-500/10 to-red-700/10 border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-orange-100">
                Refer & Earn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-200 mb-3">
                Invite friends and earn 100 gems when they book their first class!
              </p>
              <button className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors">
                Get Referral Link
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
