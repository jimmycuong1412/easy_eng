'use client';

export const dynamic = 'force-dynamic';

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
import { useTranslations } from 'next-intl';
import { GemImage } from '@/components/common/GemImage';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

// Career Avatars data — names/skills/classes stay in English (product names)
const careerAvatars = [
  {
    id: 'business_pro',
    icon: Briefcase,
    color: 'from-blue-500 to-indigo-600',
    skills: ['Business Writing', 'Negotiation', 'Presentation', 'Meeting Skills'],
    targetLevel: 'B2-C1',
    duration: '6-12m',
    popularClasses: ['Business Email', 'Meeting English', 'Negotiation Skills'],
  },
  {
    id: 'global_citizen',
    icon: Globe,
    color: 'from-emerald-500 to-teal-600',
    skills: ['Conversation', 'Cultural Awareness', 'Travel English', 'Social Skills'],
    targetLevel: 'B1-B2',
    duration: '4-8m',
    popularClasses: ['Daily Conversation', 'Travel English', 'Cultural Exchange'],
  },
  {
    id: 'academic_achiever',
    icon: GraduationCap,
    color: 'from-purple-500 to-violet-600',
    skills: ['Academic Writing', 'Critical Thinking', 'Research Skills', 'Test Prep'],
    targetLevel: 'B2-C1',
    duration: '6-12m',
    popularClasses: ['IELTS Speaking', 'Academic Writing', 'TOEFL Prep'],
  },
  {
    id: 'corporate_leader',
    icon: Building2,
    color: 'from-slate-600 to-gray-700',
    skills: ['Leadership Communication', 'Team Management', 'Strategic Thinking', 'Executive Presence'],
    targetLevel: 'C1-C2',
    duration: '8-15m',
    popularClasses: ['Executive English', 'Leadership Skills', 'Strategic Communication'],
  },
  {
    id: 'wanderlust',
    icon: Plane,
    color: 'from-orange-500 to-amber-600',
    skills: ['Travel Vocabulary', 'Survival English', 'Cultural Tips', 'Practical Communication'],
    targetLevel: 'A2-B1',
    duration: '2-4m',
    popularClasses: ['Airport English', 'Hotel & Restaurant', 'Asking Directions'],
  },
  {
    id: 'healthcare_hero',
    icon: HeartPulse,
    color: 'from-red-500 to-rose-600',
    skills: ['Medical Terminology', 'Patient Communication', 'Healthcare Documentation', 'Emergency English'],
    targetLevel: 'B2-C1',
    duration: '6-10m',
    popularClasses: ['Medical English', 'Patient Care', 'Healthcare Communication'],
  },
  {
    id: 'legal_expert',
    icon: Scale,
    color: 'from-amber-600 to-yellow-700',
    skills: ['Legal Terminology', 'Contract English', 'Court Language', 'Legal Writing'],
    targetLevel: 'C1-C2',
    duration: '8-14m',
    popularClasses: ['Legal English', 'Contract Writing', 'Court Procedures'],
  },
  {
    id: 'tech_innovator',
    icon: Cpu,
    color: 'from-cyan-500 to-blue-600',
    skills: ['Tech Vocabulary', 'Documentation', 'Agile Communication', 'Technical Presentation'],
    targetLevel: 'B1-B2',
    duration: '4-8m',
    popularClasses: ['IT English', 'Technical Writing', 'Agile Meetings'],
  },
];

type CareerId = typeof careerAvatars[number]['id'];

export default function CareerAvatarPage() {
  const router = useRouter();
  const t = useTranslations('careerAvatar');
  const [currentStep, setCurrentStep] = React.useState(0);
  const [selectedAvatar, setSelectedAvatar] = React.useState<CareerId | null>(null);

  const steps = [
    { id: 'welcome', title: t('stepWelcome') },
    { id: 'select', title: t('stepSelect') },
    { id: 'confirm', title: t('stepConfirm') },
  ];

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
    <div className="py-8">
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

              <h1 className="text-3xl font-bold text-white mb-4">{t('welcomeTitle')}</h1>
              <p className="text-slate-400 max-w-lg mx-auto mb-8">{t('welcomeDesc')}</p>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">{t('benefit1Title')}</h3>
                    <p className="text-sm text-slate-400">{t('benefit1Desc')}</p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                      <Target className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">{t('benefit2Title')}</h3>
                    <p className="text-sm text-slate-400">{t('benefit2Desc')}</p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                      <Rocket className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">{t('benefit3Title')}</h3>
                    <p className="text-sm text-slate-400">{t('benefit3Desc')}</p>
                  </CardContent>
                </Card>
              </div>

              <Button
                size="lg"
                className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                onClick={handleNext}
              >
                {t('startChoosing')}
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
                <h1 className="text-2xl font-bold text-white mb-2">{t('selectTitle')}</h1>
                <p className="text-slate-400">{t('selectDesc')}</p>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid md:grid-cols-2 gap-4 mb-8"
              >
                {careerAvatars.map((avatar) => {
                  const careerT = t.raw(`careers.${avatar.id}`) as { name: string; desc: string };
                  return (
                    <motion.div key={avatar.id} variants={itemVariants}>
                      <Card
                        className={`cursor-pointer transition-all hover:scale-[1.02] ${
                          selectedAvatar === avatar.id
                            ? 'ring-2 ring-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/50'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                        onClick={() => setSelectedAvatar(avatar.id as CareerId)}
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
                                <h3 className="font-bold text-white">{careerT.name}</h3>
                                {selectedAvatar === avatar.id && (
                                  <div className="w-6 h-6 rounded-full bg-[#3B82F6] flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-slate-400 line-clamp-2">{careerT.desc}</p>
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
                  );
                })}
              </motion.div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                  onClick={handleBack}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  {t('back')}
                </Button>
                <Button
                  className="flex-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                  onClick={handleNext}
                  disabled={!selectedAvatar}
                >
                  {t('continue')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === 2 && selectedAvatarData && (() => {
            const careerT = t.raw(`careers.${selectedAvatarData.id}`) as { name: string; desc: string };
            return (
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
                  <h1 className="text-2xl font-bold text-white mb-2">{t('confirmTitle')}</h1>
                  <p className="text-slate-400">
                    {t('youSelected', { name: careerT.name })}
                  </p>
                </div>

                <Card className="bg-white/5 border-white/10 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4">{careerT.name}</h3>
                    <p className="text-slate-400 mb-6">{careerT.desc}</p>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-3">{t('skillsTitle')}</h4>
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
                        <h4 className="text-sm font-semibold text-slate-300 mb-3">{t('popularClasses')}</h4>
                        <ul className="space-y-2">
                          {selectedAvatarData.popularClasses.map((cls) => (
                            <li key={cls} className="flex items-center gap-2 text-sm text-slate-400">
                              <Check className="w-4 h-4 text-emerald-400" />
                              {cls}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-4 mt-6 pt-6 border-t border-white/10">
                      <div className="flex-1 text-center">
                        <p className="text-2xl font-bold text-white">{selectedAvatarData.targetLevel}</p>
                        <p className="text-xs text-slate-400">{t('targetLevel')}</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-2xl font-bold text-white">{selectedAvatarData.duration}</p>
                        <p className="text-xs text-slate-400">{t('estimatedTime')}</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-1">15 <GemImage size={22} /></p>
                        <p className="text-xs text-slate-400">{t('completionBonus')}</p>
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
                    {t('reselect')}
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-[#3B82F6] to-purple-500 hover:opacity-90"
                    onClick={handleComplete}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('confirmStart')}
                  </Button>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </div>
  );
}
