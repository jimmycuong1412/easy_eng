'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Globe,
  GraduationCap,
  Building2,
  Plane,
  HeartPulse,
  Scale,
  Cpu,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Target,
  Rocket,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

// Career Avatars data
const careerAvatars = [
  {
    id: 'business_pro',
    name: 'Business Pro',
    nameVi: 'Chuyên gia Kinh doanh',
    icon: Briefcase,
    color: 'from-blue-500 to-indigo-600',
    description: 'Thành thạo tiếng Anh thương mại, đàm phán và thuyết trình',
    skills: ['Business Writing', 'Negotiation', 'Presentation', 'Meeting Skills'],
    targetLevel: 'B2-C1',
    duration: '6-12 tháng',
    popularClasses: ['Business Email', 'Meeting English', 'Negotiation Skills'],
  },
  {
    id: 'global_citizen',
    name: 'Global Citizen',
    nameVi: 'Công dân Toàn cầu',
    icon: Globe,
    color: 'from-emerald-500 to-teal-600',
    description: 'Giao tiếp tự tin trong môi trường quốc tế đa văn hóa',
    skills: ['Conversation', 'Cultural Awareness', 'Travel English', 'Social Skills'],
    targetLevel: 'B1-B2',
    duration: '4-8 tháng',
    popularClasses: ['Daily Conversation', 'Travel English', 'Cultural Exchange'],
  },
  {
    id: 'academic_achiever',
    name: 'Academic Achiever',
    nameVi: 'Học giả Xuất sắc',
    icon: GraduationCap,
    color: 'from-purple-500 to-violet-600',
    description: 'Chuẩn bị cho IELTS, TOEFL và du học nước ngoài',
    skills: ['Academic Writing', 'Critical Thinking', 'Research Skills', 'Test Prep'],
    targetLevel: 'B2-C1',
    duration: '6-12 tháng',
    popularClasses: ['IELTS Speaking', 'Academic Writing', 'TOEFL Prep'],
  },
  {
    id: 'corporate_leader',
    name: 'Corporate Leader',
    nameVi: 'Lãnh đạo Doanh nghiệp',
    icon: Building2,
    color: 'from-slate-600 to-gray-700',
    description: 'Kỹ năng lãnh đạo và quản lý bằng tiếng Anh chuyên nghiệp',
    skills: ['Leadership Communication', 'Team Management', 'Strategic Thinking', 'Executive Presence'],
    targetLevel: 'C1-C2',
    duration: '8-15 tháng',
    popularClasses: ['Executive English', 'Leadership Skills', 'Strategic Communication'],
  },
  {
    id: 'wanderlust',
    name: 'Wanderlust',
    nameVi: 'Người Thích Du lịch',
    icon: Plane,
    color: 'from-orange-500 to-amber-600',
    description: 'Tự tin giao tiếp khi du lịch và khám phá thế giới',
    skills: ['Travel Vocabulary', 'Survival English', 'Cultural Tips', 'Practical Communication'],
    targetLevel: 'A2-B1',
    duration: '2-4 tháng',
    popularClasses: ['Airport English', 'Hotel & Restaurant', 'Asking Directions'],
  },
  {
    id: 'healthcare_hero',
    name: 'Healthcare Hero',
    nameVi: 'Anh hùng Y tế',
    icon: HeartPulse,
    color: 'from-red-500 to-rose-600',
    description: 'Tiếng Anh chuyên ngành y tế và chăm sóc sức khỏe',
    skills: ['Medical Terminology', 'Patient Communication', 'Healthcare Documentation', 'Emergency English'],
    targetLevel: 'B2-C1',
    duration: '6-10 tháng',
    popularClasses: ['Medical English', 'Patient Care', 'Healthcare Communication'],
  },
  {
    id: 'legal_expert',
    name: 'Legal Expert',
    nameVi: 'Chuyên gia Pháp lý',
    icon: Scale,
    color: 'from-amber-600 to-yellow-700',
    description: 'Tiếng Anh pháp lý cho luật sư và chuyên gia pháp luật',
    skills: ['Legal Terminology', 'Contract English', 'Court Language', 'Legal Writing'],
    targetLevel: 'C1-C2',
    duration: '8-14 tháng',
    popularClasses: ['Legal English', 'Contract Writing', 'Court Procedures'],
  },
  {
    id: 'tech_innovator',
    name: 'Tech Innovator',
    nameVi: 'Nhà Sáng tạo Công nghệ',
    icon: Cpu,
    color: 'from-cyan-500 to-blue-600',
    description: 'Tiếng Anh cho ngành IT, lập trình và công nghệ',
    skills: ['Tech Vocabulary', 'Documentation', 'Agile Communication', 'Technical Presentation'],
    targetLevel: 'B1-B2',
    duration: '4-8 tháng',
    popularClasses: ['IT English', 'Technical Writing', 'Agile Meetings'],
  },
];

// Onboarding steps
const steps = [
  { id: 'welcome', title: 'Chào mừng' },
  { id: 'select', title: 'Chọn Avatar' },
  { id: 'confirm', title: 'Xác nhận' },
];

export default function CareerAvatarPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [selectedAvatar, setSelectedAvatar] = React.useState<string | null>(null);

  const selectedAvatarData = careerAvatars.find((a) => a.id === selectedAvatar);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    // Save to database and redirect
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    index <= currentStep
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-3 rounded-full transition-colors ${
                      index < currentStep ? 'bg-[#3B82F6]' : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {steps.map((step) => (
              <span key={step.id} className="text-xs text-slate-400">
                {step.title}
              </span>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Welcome */}
          {currentStep === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-[#3B82F6] to-purple-500 flex items-center justify-center mx-auto mb-6"
              >
                <Target className="w-12 h-12 text-white" />
              </motion.div>

              <h1 className="text-3xl font-bold text-white mb-4">
                Chọn Career Avatar của bạn 🎯
              </h1>
              <p className="text-slate-400 max-w-lg mx-auto mb-8">
                Career Avatar sẽ giúp chúng tôi cá nhân hóa lộ trình học tập, đề xuất lớp học phù hợp
                và theo dõi tiến độ của bạn một cách hiệu quả nhất.
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">Lộ trình cá nhân hóa</h3>
                    <p className="text-sm text-slate-400">
                      Nhận đề xuất lớp học phù hợp với mục tiêu của bạn
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                      <Target className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">Mục tiêu rõ ràng</h3>
                    <p className="text-sm text-slate-400">
                      Biết chính xác cần học gì để đạt được mục tiêu
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                      <Rocket className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">Tiến bộ nhanh hơn</h3>
                    <p className="text-sm text-slate-400">
                      Tập trung vào kỹ năng cần thiết cho nghề nghiệp
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Button
                size="lg"
                className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                onClick={handleNext}
              >
                Bắt đầu chọn
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Select Avatar */}
          {currentStep === 1 && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">Chọn Career Avatar</h1>
                <p className="text-slate-400">
                  Mục tiêu học tiếng Anh của bạn là gì? Hãy chọn avatar phù hợp nhất.
                </p>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid md:grid-cols-2 gap-4 mb-8"
              >
                {careerAvatars.map((avatar) => (
                  <motion.div key={avatar.id} variants={itemVariants}>
                    <Card
                      className={`cursor-pointer transition-all hover:scale-[1.02] ${
                        selectedAvatar === avatar.id
                          ? 'ring-2 ring-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/50'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                      onClick={() => setSelectedAvatar(avatar.id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${avatar.color} flex items-center justify-center flex-shrink-0`}
                          >
                            <avatar.icon className="w-7 h-7 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-bold text-white">{avatar.name}</h3>
                              {selectedAvatar === avatar.id && (
                                <div className="w-6 h-6 rounded-full bg-[#3B82F6] flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-[#3B82F6] mb-2">{avatar.nameVi}</p>
                            <p className="text-sm text-slate-400 line-clamp-2">
                              {avatar.description}
                            </p>
                            <div className="flex gap-2 mt-3">
                              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                {avatar.targetLevel}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                {avatar.duration}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                  onClick={handleBack}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Quay lại
                </Button>
                <Button
                  className="flex-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                  onClick={handleNext}
                  disabled={!selectedAvatar}
                >
                  Tiếp tục
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === 2 && selectedAvatarData && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${selectedAvatarData.color} flex items-center justify-center mx-auto mb-4`}
                >
                  <selectedAvatarData.icon className="w-12 h-12 text-white" />
                </motion.div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Xác nhận Career Avatar
                </h1>
                <p className="text-slate-400">
                  Bạn đã chọn <span className="text-[#3B82F6] font-semibold">{selectedAvatarData.name}</span>
                </p>
              </div>

              <Card className="bg-white/5 border-white/10 mb-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">{selectedAvatarData.nameVi}</h3>
                  <p className="text-slate-400 mb-6">{selectedAvatarData.description}</p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">Kỹ năng sẽ học</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAvatarData.skills.map((skill) => (
                          <Badge
                            key={skill}
                            className="bg-[#3B82F6]/20 text-[#3B82F6] border-0"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">Lớp học phổ biến</h4>
                      <ul className="space-y-2">
                        {selectedAvatarData.popularClasses.map((className) => (
                          <li key={className} className="flex items-center gap-2 text-sm text-slate-400">
                            <Check className="w-4 h-4 text-emerald-400" />
                            {className}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6 pt-6 border-t border-white/10">
                    <div className="flex-1 text-center">
                      <p className="text-2xl font-bold text-white">{selectedAvatarData.targetLevel}</p>
                      <p className="text-xs text-slate-400">Trình độ mục tiêu</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-2xl font-bold text-white">{selectedAvatarData.duration}</p>
                      <p className="text-xs text-slate-400">Thời gian dự kiến</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-2xl font-bold text-amber-400">15 🍪</p>
                      <p className="text-xs text-slate-400">Thưởng hoàn thành</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                  onClick={handleBack}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Chọn lại
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-[#3B82F6] to-purple-500 hover:opacity-90"
                  onClick={handleComplete}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Xác nhận & Bắt đầu
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
