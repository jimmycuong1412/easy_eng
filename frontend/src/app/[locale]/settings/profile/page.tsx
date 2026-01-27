'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Camera,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Save,
  Loader2,
  Check,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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

// Mock user data - will be replaced with real data
const mockUser = {
  id: '1',
  fullName: 'Nguyễn Văn An',
  displayName: 'An Nguyễn',
  email: 'an.nguyen@example.com',
  phone: '+84 912 345 678',
  avatar: undefined, // Will use fallback with user initials
  role: 'student',
  location: 'Hồ Chí Minh, Việt Nam',
  dateOfBirth: '1995-05-15',
  bio: 'Đang học tiếng Anh để chuẩn bị cho kỳ thi IELTS. Mục tiêu band 7.0!',
  joinedAt: '2024-01-15',
  cookieBalance: 150,
  xp: 2450,
  level: 12,
};

export default function ProfileSettingsPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [formData, setFormData] = React.useState({
    fullName: mockUser.fullName,
    displayName: mockUser.displayName,
    email: mockUser.email,
    phone: mockUser.phone,
    location: mockUser.location,
    dateOfBirth: mockUser.dateOfBirth,
    bio: mockUser.bio,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setIsSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
    setIsSaved(true);

    // Reset saved state after 3 seconds
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Profile Header Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-[#3B82F6]/30">
                  <AvatarImage src={mockUser.avatar} />
                  <AvatarFallback className="bg-[#3B82F6] text-white text-2xl">
                    {mockUser.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 p-2 bg-[#3B82F6] rounded-full hover:bg-[#3B82F6]/90 transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Info */}
              <div className="text-center sm:text-left flex-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-xl font-bold text-white">{mockUser.fullName}</h2>
                  <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-0">
                    {mockUser.role === 'student' ? 'Học viên' : mockUser.role}
                  </Badge>
                </div>
                <p className="text-slate-400 mt-1">{mockUser.email}</p>
                <p className="text-sm text-slate-500 mt-2">
                  Tham gia từ {new Date(mockUser.joinedAt).toLocaleDateString('vi-VN')}
                </p>
              </div>

              {/* Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">🍪 {mockUser.cookieBalance}</p>
                  <p className="text-xs text-slate-400">Cookies</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#3B82F6]">⚡ {mockUser.xp}</p>
                  <p className="text-xs text-slate-400">XP</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400">Lv.{mockUser.level}</p>
                  <p className="text-xs text-slate-400">Level</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Profile Form */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#3B82F6]" />
              Thông tin cá nhân
            </CardTitle>
            <CardDescription className="text-slate-400">
              Cập nhật thông tin hồ sơ của bạn. Thông tin này sẽ được hiển thị cho giáo viên.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-slate-300">
                    Họ và tên
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="pl-10 bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                      placeholder="Nhập họ và tên"
                    />
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-slate-300">
                    Tên hiển thị
                  </Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    className="bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                    placeholder="Tên hiển thị trong lớp học"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10 bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-300">
                    Số điện thoại
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-10 bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                      placeholder="+84 xxx xxx xxx"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-slate-300">
                    Địa điểm
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="pl-10 bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                      placeholder="Thành phố, Quốc gia"
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-slate-300">
                    Ngày sinh
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="pl-10 bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                    />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-slate-300">
                  Giới thiệu bản thân
                </Label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] resize-none"
                  placeholder="Viết vài dòng về bản thân và mục tiêu học tập..."
                />
                <p className="text-xs text-slate-500">
                  {formData.bio.length}/500 ký tự
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-4">
                {isSaved && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-emerald-400"
                  >
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Đã lưu thay đổi</span>
                  </motion.div>
                )}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 min-w-[140px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div variants={itemVariants}>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-400">Vùng nguy hiểm</CardTitle>
            <CardDescription className="text-slate-400">
              Các hành động không thể hoàn tác. Hãy cẩn thận!
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              Vô hiệu hóa tài khoản
            </Button>
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              Xóa tài khoản vĩnh viễn
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
