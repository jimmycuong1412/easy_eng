'use client'

// Page: Student Character Profile
// Description: Shows character viewer, level progress, and customization options
// Related to: Phase 10 - Character & Gamification System (T154)

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import CharacterViewer from '@/components/character/CharacterViewer'
import { XPBar } from '@/components/character/XPBar'
import { LevelBadge } from '@/components/character/LevelBadge'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

interface CharacterData {
  sprite_url: string
  color_palette: { primary: string; secondary: string }
  current_level: number
  animation_data?: any
}

interface StudentData {
  career_name: string
  career_slug: string
  xp_balance: number
  gold_balance: number
  current_level: number
  xp_to_next_level: number
}

interface EquippedItem {
  item_id: string
  name: string
  category: 'hat' | 'outfit' | 'background' | 'emote' | 'pet'
  sprite_url: string
}

export default function CharacterPage() {
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('character')

  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [characterData, setCharacterData] = useState<CharacterData | null>(null)
  const [equippedItems, setEquippedItems] = useState<EquippedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    loadCharacterData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCharacterData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Load student character and career data
      const { data: studentLevelData, error: levelError } = await supabase
        .from('student_careers')
        .select(`
          *,
          career_paths!student_careers_career_id_fkey(name, slug, primary_color, secondary_color)
        `)
        .eq('student_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (levelError) throw levelError

      // No career selected yet — prompt user to pick one
      if (!studentLevelData) {
        setError('no_career')
        setIsLoading(false)
        return
      }

      const careerData = (studentLevelData as any).career_paths

      setStudentData({
        career_name: careerData?.name || '',
        career_slug: careerData?.slug || '',
        xp_balance: studentLevelData.total_xp_earned || 0,
        gold_balance: 0,
        current_level: studentLevelData.current_level || 1,
        xp_to_next_level: 100,
      })

      // Load character sprite data
      const { data: spriteData, error: spriteError } = await supabase.rpc(
        'get_student_sprite',
        { p_student_id: user.id }
      )

      if (!spriteError && spriteData && spriteData.length > 0) {
        const sprite = spriteData[0]
        setCharacterData({
          sprite_url: sprite.sprite_url,
          color_palette: sprite.color_palette,
          current_level: sprite.current_level,
          animation_data: sprite.animation_data,
        })
      } else {
        // Fallback to default sprite
        setCharacterData({
          sprite_url: '/character-sprites/default-level-1.png',
          color_palette: {
            primary: careerData.primary_color,
            secondary: careerData.secondary_color,
          },
          current_level: studentLevelData.current_level,
        })
      }

      // Load equipped items
      const { data: itemsData, error: itemsError } = await supabase.rpc(
        'get_equipped_items',
        { p_student_id: user.id }
      )

      if (!itemsError && itemsData) {
        setEquippedItems(itemsData)
      }

      setIsLoading(false)
    } catch (err: any) {
      console.error('Error loading character data:', err)
      setError(err.message || 'Failed to load character data')
      setIsLoading(false)
    }
  }

  const handleManageItems = () => {
    router.push('/student/marketplace')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-white text-xl">{t('loadingCharacter')}</div>
      </div>
    )
  }

  if (error === 'no_career') {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <div className="text-6xl">🎮</div>
          <h2 className="text-2xl font-bold text-white">{t('noCareer')}</h2>
          <p className="text-gray-400">{t('noCareerDesc')}</p>
          <button
            onClick={() => router.push('/onboarding/career-avatar')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            {t('chooseCareer')}
          </button>
        </div>
      </div>
    )
  }

  if (error || !studentData || !characterData) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-red-400 text-xl">{error || t('notFound')}</div>
      </div>
    )
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Left Column: Character Display */}
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white text-center mb-6">
                {t('title')}
              </h2>

              <CharacterViewer
                characterData={characterData}
                equippedItems={equippedItems}
                showLevel={true}
                size="large"
                animate={true}
                className="mb-6"
              />

              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  {studentData.career_name}
                </h3>
                <div className="flex items-center justify-center gap-2">
                  <LevelBadge level={studentData.current_level} size="lg" />
                </div>
              </div>
            </div>

            {/* Equipped Items */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{t('equippedItems')}</h3>
                <button
                  onClick={handleManageItems}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {t('marketplace')}
                </button>
              </div>

              {equippedItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {equippedItems.map((item) => (
                    <div
                      key={item.item_id}
                      className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
                    >
                      <div className="w-12 h-12 bg-gray-900 rounded flex items-center justify-center overflow-hidden">
                        <Image
                          src={item.sprite_url}
                          alt={item.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{item.name}</p>
                        <p className="text-gray-400 text-xs capitalize">{item.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">{t('noItemsEquipped')}</p>
                  <button
                    onClick={handleManageItems}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    {t('visitMarketplace')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Progress & Stats */}
          <div className="space-y-6">
            {/* XP Progress */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">{t('experienceProgress')}</h3>

              <XPBar
                currentXP={studentData.xp_balance}
                xpToNextLevel={studentData.xp_to_next_level}
                currentLevel={studentData.current_level}
              />

              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-gray-400 text-sm">{t('currentLevel')}</p>
                  <p className="text-white text-2xl font-bold">{studentData.current_level}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">{t('totalXP')}</p>
                  <p className="text-white text-2xl font-bold">
                    {studentData.xp_balance.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">{t('nextLevel')}</p>
                  <p className="text-white text-2xl font-bold">
                    {studentData.xp_to_next_level.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Gold Balance */}
            <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 backdrop-blur-sm rounded-xl p-6 border border-yellow-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-200 text-sm font-medium">{t('goldCoins')}</p>
                  <p className="text-white text-3xl font-bold mt-1">
                    {studentData.gold_balance.toLocaleString()}
                  </p>
                </div>
                <div className="text-5xl">🪙</div>
              </div>
              <p className="text-yellow-200/70 text-sm mt-3">{t('goldDesc')}</p>
            </div>

            {/* How to Earn More */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">{t('earnMoreRewards')}</h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📚</span>
                  <div>
                    <h4 className="text-white font-medium">{t('earnTips.completeClasses')}</h4>
                    <p className="text-sm text-gray-400">{t('earnTips.completeClassesDesc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <h4 className="text-white font-medium">{t('earnTips.dailyLogin')}</h4>
                    <p className="text-sm text-gray-400">{t('earnTips.dailyLoginDesc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <h4 className="text-white font-medium">{t('earnTips.weeklyStreak')}</h4>
                    <p className="text-sm text-gray-400">{t('earnTips.weeklyStreakDesc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <h4 className="text-white font-medium">{t('earnTips.quizExcellence')}</h4>
                    <p className="text-sm text-gray-400">{t('earnTips.quizExcellenceDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleManageItems}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
              >
                🛒 {t('marketplace')}
              </button>
              <button
                onClick={() => router.push('/student/dashboard')}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                📊 {t('dashboard')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
