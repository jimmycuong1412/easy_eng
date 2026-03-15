'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Share2,
  Copy,
  Gift,
  Users,
  Check,
  Gem,
  Trophy,
  Facebook,
  Twitter,
  Send,
} from 'lucide-react';

import { GemImage } from '@/components/common/GemImage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { getUserReferralData } from '@/lib/queries';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const milestones = [
  { referrals: 5, reward: '100 Gems + Badge Bronze', achieved: false },
  { referrals: 10, reward: '250 Gems + Badge Silver', achieved: false },
  { referrals: 25, reward: '500 Gems + Badge Gold', achieved: false },
  { referrals: 50, reward: '1000 Gems + Badge Diamond + 1 Free Class', achieved: false },
];

export default function ReferralSettingsPage() {
  const { user } = useAuth();
  const [copied, setCopied] = React.useState(false);
  const [referralData, setReferralData] = React.useState({
    code: '',
    totalReferrals: 0,
    successfulReferrals: 0,
    pendingReferrals: 0,
    totalGemsEarned: 0,
    nextMilestone: 5,
    referredUsers: [] as Array<{ name: string; date: string; status: string; gemsEarned: number }>,
  });

  React.useEffect(() => {
    if (!user?.id) return;
    getUserReferralData(user.id)
      .then((data: Record<string, unknown>) => {
        const referrals = (data.referrals as Array<Record<string, unknown>>) || [];
        const successful = referrals.filter((r) => r.referred_completed_first_class);
        setReferralData({
          code: (data.referral_code as string) || '',
          totalReferrals: (data.total_referrals as number) || 0,
          successfulReferrals: successful.length,
          pendingReferrals: referrals.length - successful.length,
          totalGemsEarned: (data.total_gems_earned as number) || 0,
          nextMilestone: milestones.find((m) => m.referrals > referrals.length)?.referrals || 50,
          referredUsers: referrals.map((r) => ({
            name: 'Referred User',
            date: new Date(r.created_at as string).toLocaleDateString('vi-VN'),
            status: r.referred_completed_first_class ? 'completed' : 'pending',
            gemsEarned: (r.gems_awarded_to_referrer as number) || 0,
          })),
        });
        // Update milestones achieved
        milestones.forEach((m) => { m.achieved = referrals.length >= m.referrals; });
      })
      .catch(console.error);
  }, [user?.id]);

  const referralLink = `https://easyeng.vn/join?ref=${referralData.code}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    const text = `Tham gia EasyEng cùng mình và nhận 20 Gems miễn phí! Dùng mã giới thiệu: ${referralData.code}`;
    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(text)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`,
    };
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Referral Hero */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-br from-[#3B82F6]/20 to-purple-500/20 border-[#3B82F6]/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="p-4 bg-[#3B82F6]/20 rounded-2xl">
                <Gift className="w-12 h-12 text-[#3B82F6]" />
              </div>
              <div className="text-center md:text-left flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Giới thiệu bạn bè, nhận Gems! <GemImage size={24} className="inline-block align-middle ml-1" />
                </h2>
                <p className="text-slate-300">
                  Mỗi bạn bè đăng ký thành công, bạn nhận <span className="text-amber-400 font-bold">50 Gems</span>.
                  Bạn bè của bạn cũng nhận <span className="text-amber-400 font-bold">20 Gems</span> miễn phí!
                </p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-amber-400 flex items-center justify-center gap-1"><GemImage size={32} /> {referralData.totalGemsEarned}</p>
                <p className="text-sm text-slate-400">Đã kiếm được</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Referral Code */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#3B82F6]" />
              Mã giới thiệu của bạn
            </CardTitle>
            <CardDescription className="text-slate-400">
              Chia sẻ mã này với bạn bè để cả hai cùng nhận thưởng.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Code Display */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  readOnly
                  value={referralData.code}
                  className="text-center text-2xl font-bold tracking-wider bg-white/5 border-white/20 text-white h-14"
                />
              </div>
              <Button
                onClick={handleCopyCode}
                className="h-14 px-6 bg-[#3B82F6] hover:bg-[#3B82F6]/90"
              >
                {copied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* Share Link */}
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Link giới thiệu</label>
              <div className="flex gap-3">
                <Input
                  readOnly
                  value={referralLink}
                  className="bg-white/5 border-white/10 text-slate-300 text-sm"
                />
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => handleShare('facebook')}
                className="flex-1 bg-[#1877F2] hover:bg-[#1877F2]/90"
              >
                <Facebook className="w-4 h-4 mr-2" />
                Facebook
              </Button>
              <Button
                onClick={() => handleShare('twitter')}
                className="flex-1 bg-[#1DA1F2] hover:bg-[#1DA1F2]/90"
              >
                <Twitter className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button
                onClick={() => handleShare('telegram')}
                className="flex-1 bg-[#0088CC] hover:bg-[#0088CC]/90"
              >
                <Send className="w-4 h-4 mr-2" />
                Telegram
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats & Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stats */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 border-white/10 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Thống kê giới thiệu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <p className="text-2xl font-bold text-white">{referralData.totalReferrals}</p>
                  <p className="text-xs text-slate-400">Tổng cộng</p>
                </div>
                <div className="text-center p-3 bg-emerald-500/10 rounded-xl">
                  <p className="text-2xl font-bold text-emerald-400">{referralData.successfulReferrals}</p>
                  <p className="text-xs text-slate-400">Thành công</p>
                </div>
                <div className="text-center p-3 bg-amber-500/10 rounded-xl">
                  <p className="text-2xl font-bold text-amber-400">{referralData.pendingReferrals}</p>
                  <p className="text-xs text-slate-400">Đang chờ</p>
                </div>
              </div>

              {/* Progress to next milestone */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tiến độ milestone tiếp theo</span>
                  <span className="text-white">
                    {referralData.successfulReferrals}/{referralData.nextMilestone}
                  </span>
                </div>
                <Progress
                  value={(referralData.successfulReferrals / referralData.nextMilestone) * 100}
                  className="h-2 bg-white/10"
                />
                <p className="text-xs text-slate-500">
                  Còn {referralData.nextMilestone - referralData.successfulReferrals} người nữa để nhận 250 Gems!
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Milestones */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 border-white/10 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Mốc thưởng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    milestone.achieved
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-white/5'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    milestone.achieved ? 'bg-emerald-500/20' : 'bg-white/10'
                  }`}>
                    {milestone.achieved ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Gem className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${milestone.achieved ? 'text-emerald-400' : 'text-white'}`}>
                      {milestone.referrals} giới thiệu
                    </p>
                    <p className="text-xs text-slate-400">{milestone.reward}</p>
                  </div>
                  {milestone.achieved && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                      Đã đạt
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Referred Users */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Danh sách người được giới thiệu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referralData.referredUsers.map((user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6] font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(user.date).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={
                      user.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400 border-0'
                        : 'bg-amber-500/20 text-amber-400 border-0'
                    }>
                      {user.status === 'completed' ? 'Hoàn thành' : 'Đang chờ'}
                    </Badge>
                    {user.gemsEarned > 0 && (
                      <span className="text-amber-400 font-bold">
                        +{user.gemsEarned} <GemImage size={14} className="inline-block align-middle" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
