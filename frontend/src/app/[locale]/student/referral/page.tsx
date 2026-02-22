'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Gift,
  Copy,
  Check,
  Users,
  Gem,
  Share2,
  Facebook,
  MessageCircle,
  Loader2,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { getUserReferralData } from '@/lib/queries';
import { GemImage } from '@/components/common/GemImage';

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

interface ReferralHistoryItem {
  id: string;
  userName: string;
  userAvatar: string | undefined;
  referredAt: string;
  status: string;
  gemsEarned: number;
}

interface ReferralData {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  pendingReferrals: number;
  successfulReferrals: number;
  totalGemsEarned: number;
  currentTier: string;
  nextTierProgress: number;
  referralHistory: ReferralHistoryItem[];
  tiers: { name: string; minReferrals: number; bonus: number }[];
}

const defaultTiers = [
  { name: 'Bronze', minReferrals: 0, bonus: 0 },
  { name: 'Silver', minReferrals: 3, bonus: 10 },
  { name: 'Gold', minReferrals: 10, bonus: 25 },
  { name: 'Platinum', minReferrals: 25, bonus: 50 },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ReferralPage() {
  const { user } = useAuth();
  const [copied, setCopied] = React.useState(false);
  const [loading, setLoading] = useState(false);
  const [referralData, setReferralData] = useState<ReferralData>({
    referralCode: '',
    referralLink: '',
    totalReferrals: 0,
    pendingReferrals: 0,
    successfulReferrals: 0,
    totalGemsEarned: 0,
    currentTier: 'bronze',
    nextTierProgress: 0,
    referralHistory: [],
    tiers: defaultTiers,
  });

  useEffect(() => {
    if (!user?.id) return;

    const fetchReferralData = async () => {
      try {
        setLoading(true);
        const data = await getUserReferralData(user.id) as Record<string, unknown> | null;

        if (data) {
          const referrals = (data.referrals as Record<string, unknown>[]) || [];
          const code = (data.code as string) || '';

          const successfulReferrals = referrals.filter(
            (r) => r.referred_completed_first_class === true
          ).length;
          const pendingReferrals = referrals.filter(
            (r) => r.referred_completed_first_class !== true
          ).length;
          const totalGemsEarned = referrals.reduce(
            (sum, r) => sum + ((r.gems_awarded_to_referrer as number) || 0),
            0
          );

          // Determine tier
          let currentTier = 'bronze';
          for (const tier of [...defaultTiers].reverse()) {
            if (successfulReferrals >= tier.minReferrals) {
              currentTier = tier.name.toLowerCase();
              break;
            }
          }

          const history: ReferralHistoryItem[] = referrals.map((r) => ({
            id: r.id as string,
            userName: (r.referred_id as string) || 'User',
            userAvatar: undefined,
            referredAt: r.created_at as string,
            status: r.referred_completed_first_class ? 'completed' : 'pending',
            gemsEarned: (r.gems_awarded_to_referrer as number) || 0,
          }));

          setReferralData({
            referralCode: code,
            referralLink: `https://easyeng.vn/ref/${code}`,
            totalReferrals: referrals.length,
            pendingReferrals,
            successfulReferrals,
            totalGemsEarned,
            currentTier,
            nextTierProgress: 0,
            referralHistory: history,
            tiers: defaultTiers,
          });
        }
      } catch (err) {
        console.error('Error fetching referral data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReferralData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(referralData.referralLink);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const shareToZalo = () => {
    const url = encodeURIComponent(referralData.referralLink);
    const title = encodeURIComponent('Học tiếng Anh cùng tôi trên EasyEng - Nhận 50 Gems miễn phí!');
    window.open(`https://zalo.me/share?u=${url}&t=${title}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 mb-4">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Giới thiệu bạn bè 🎁</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Mời bạn bè học cùng và nhận <span className="text-amber-400 font-semibold">50 Gems</span> khi họ hoàn thành lớp học đầu tiên!
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <motion.div variants={itemVariants}>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 text-[#3B82F6] mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{referralData.totalReferrals}</p>
                <p className="text-xs text-slate-400">Đã giới thiệu</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <Check className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-400">{referralData.successfulReferrals}</p>
                <p className="text-xs text-slate-400">Hoàn thành</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <Gem className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-400">{referralData.totalGemsEarned}</p>
                <p className="text-xs text-slate-400">Gems kiếm được</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <Gift className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-400">{referralData.pendingReferrals}</p>
                <p className="text-xs text-slate-400">Đang chờ</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Referral Link Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-[#3B82F6]/20 to-purple-500/20 border-[#3B82F6]/30 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Link giới thiệu của bạn
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Referral Code */}
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className="flex-1">
                  <p className="text-xs text-slate-400 mb-1">Mã giới thiệu</p>
                  <p className="text-xl font-mono font-bold text-[#3B82F6]">
                    {referralData.referralCode}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(referralData.referralCode)}
                  className="border-[#3B82F6]/30 text-[#3B82F6] hover:bg-[#3B82F6]/10"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              {/* Referral Link */}
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 mb-1">Link giới thiệu</p>
                  <p className="text-sm text-white truncate">{referralData.referralLink}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(referralData.referralLink)}
                  className="border-[#3B82F6]/30 text-[#3B82F6] hover:bg-[#3B82F6]/10"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              {/* Share Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={shareToFacebook}
                  className="flex-1 bg-[#1877F2] hover:bg-[#1877F2]/90"
                >
                  <Facebook className="w-4 h-4 mr-2" />
                  Facebook
                </Button>
                <Button
                  onClick={shareToZalo}
                  className="flex-1 bg-[#0068FF] hover:bg-[#0068FF]/90"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Zalo
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Cách thức hoạt động</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[#3B82F6]/20 text-[#3B82F6] flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                    1
                  </div>
                  <h4 className="font-semibold text-white mb-2">Chia sẻ link</h4>
                  <p className="text-sm text-slate-400">
                    Gửi link giới thiệu cho bạn bè qua mạng xã hội
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                    2
                  </div>
                  <h4 className="font-semibold text-white mb-2">Bạn bè đăng ký</h4>
                  <p className="text-sm text-slate-400">
                    Bạn bè tạo tài khoản và đặt lớp học đầu tiên
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                    3
                  </div>
                  <h4 className="font-semibold text-white mb-2">Nhận thưởng</h4>
                  <p className="text-sm text-slate-400">
                    Nhận 50 <GemImage size={14} className="inline-block align-middle" /> khi họ hoàn thành lớp học đầu tiên
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tier Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Cấp độ giới thiệu</span>
                <Badge className="bg-slate-500/20 text-slate-300 border-0 capitalize">
                  {referralData.currentTier}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                {referralData.tiers.map((tier, index) => (
                  <React.Fragment key={tier.name}>
                    <div
                      className={`text-center ${
                        referralData.currentTier === tier.name.toLowerCase()
                          ? 'text-[#3B82F6]'
                          : referralData.successfulReferrals >= tier.minReferrals
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 text-sm font-bold ${
                          referralData.currentTier === tier.name.toLowerCase()
                            ? 'bg-[#3B82F6]/20 ring-2 ring-[#3B82F6]'
                            : referralData.successfulReferrals >= tier.minReferrals
                              ? 'bg-emerald-500/20'
                              : 'bg-slate-700/50'
                        }`}
                      >
                        {tier.minReferrals}
                      </div>
                      <p className="text-xs">{tier.name}</p>
                      {tier.bonus > 0 && (
                        <p className="text-[10px] text-amber-400">+{tier.bonus}%</p>
                      )}
                    </div>
                    {index < referralData.tiers.length - 1 && (
                      <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#3B82F6] transition-all"
                          style={{
                            width:
                              referralData.successfulReferrals >= referralData.tiers[index + 1].minReferrals
                                ? '100%'
                                : referralData.successfulReferrals > tier.minReferrals
                                  ? `${((referralData.successfulReferrals - tier.minReferrals) / (referralData.tiers[index + 1].minReferrals - tier.minReferrals)) * 100}%`
                                  : '0%',
                          }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <p className="text-sm text-slate-400 text-center">
                Giới thiệu thêm{' '}
                <span className="text-[#3B82F6] font-semibold">
                  {10 - referralData.successfulReferrals} người
                </span>{' '}
                để đạt cấp Gold và nhận thưởng +25% mỗi lần giới thiệu!
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Referral History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Lịch sử giới thiệu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {referralData.referralHistory.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center gap-4 p-3 bg-white/5 rounded-lg"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={referral.userAvatar} />
                      <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6]">
                        {referral.userName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{referral.userName}</p>
                      <p className="text-xs text-slate-400">{formatDate(referral.referredAt)}</p>
                    </div>
                    <div className="text-right">
                      {referral.status === 'completed' ? (
                        <>
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-0 mb-1">
                            Hoàn thành
                          </Badge>
                          <p className="text-xs text-amber-400">+{referral.gemsEarned} <GemImage size={14} className="inline-block align-middle" /></p>
                        </>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400 border-0">
                          Đang chờ
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
