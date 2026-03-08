'use client'

// Page: Student Marketplace
// Description: Browse and purchase cosmetic items with Gems
// Related to: Phase 10 - Character & Gamification System (T160)

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { GemImage } from '@/components/common/GemImage';
import { useTranslations } from 'next-intl';

interface MarketplaceItem {
  id: string
  name: string
  description: string
  category: string
  price_gems: number
  image_url: string
  preview_url?: string
  career_id?: string
  min_level: number
  is_active: boolean
  is_owned: boolean
  is_equipped: boolean
}

export default function MarketplacePage() {
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('marketplace')

  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [studentGems, setStudentGems] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    loadMarketplaceData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMarketplaceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Load gem balance
      const { data: gemBalance } = await supabase.rpc('get_gems_balance', { p_user_id: user.id })
      setStudentGems(gemBalance || 0)

      // Load marketplace items
      const { data: itemsData, error: itemsError } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('is_active', true)
        .order('price_gems', { ascending: true })

      if (itemsError) throw itemsError

      // Load student inventory to check ownership/equipped status
      const { data: inventory } = await supabase
        .from('student_inventory')
        .select('item_id, equipped')
        .eq('student_id', user.id)

      const ownedMap = new Map(
        (inventory || []).map(i => [i.item_id, i.equipped])
      )

      const mapped: MarketplaceItem[] = (itemsData || []).map(item => ({
        ...item,
        is_owned: ownedMap.has(item.id),
        is_equipped: ownedMap.get(item.id) === true,
      }))

      setItems(mapped)
      setIsLoading(false)
    } catch (err: any) {
      console.error('Error loading marketplace:', err)
      setError(err.message || 'Failed to load marketplace')
      setIsLoading(false)
    }
  }

  const categories = [
    { value: 'all', icon: '🛒' },
    { value: 'hat', icon: '🎩' },
    { value: 'outfit', icon: '👔' },
    { value: 'background', icon: '🖼️' },
    { value: 'emote', icon: '😊' },
    { value: 'pet', icon: '🐾' },
  ]

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter(i => i.category === selectedCategory)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-white text-xl">{t('loadingMarketplace')}</div>
      </div>
    )
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">{t('title')}</h1>
          <p className="text-gray-400">{t('subtitle')}</p>
        </motion.div>

        {/* Gem Balance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-xl p-4 mb-6 border border-blue-500/30 max-w-md mx-auto"
        >
          <div className="flex items-center justify-between">
            <span className="text-blue-200 font-medium">{t('yourBalance')}</span>
            <div className="flex items-center gap-2">
              <span className="text-3xl"><GemImage size={32} /></span>
              <span className="text-white text-2xl font-bold">{studentGems.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-center max-w-2xl mx-auto">
            {error}
          </div>
        )}

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all duration-200
                ${
                  selectedCategory === category.value
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }
              `}
            >
              <span className="mr-2">{category.icon}</span>
              {t(`categories.${category.value}`)}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        {filteredItems.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700 flex flex-col gap-3"
              >
                <div className="w-full h-32 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <span className="text-4xl">🎁</span>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{item.name}</h3>
                  <p className="text-gray-400 text-sm line-clamp-2">{item.description}</p>
                  {item.min_level > 1 && (
                    <p className="text-yellow-400 text-xs mt-1">{t('requiresLevel', { level: item.min_level })}</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1">
                    <GemImage size={16} className="inline-block" />
                    <span className="text-white font-bold">{item.price_gems.toLocaleString()}</span>
                  </div>
                  {item.is_owned ? (
                    <span className="px-3 py-1 bg-green-600/30 text-green-400 text-sm rounded-lg border border-green-500/30">
                      {item.is_equipped ? t('equipped') : t('owned')}
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-700 text-gray-400 text-sm rounded-lg">
                      {studentGems >= item.price_gems ? t('buy') : t('notEnoughGems')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">{t('noItems')}</p>
          </div>
        )}

        {/* Quick Navigation */}
        <div className="mt-12 flex justify-center gap-4">
          <button
            onClick={() => router.push('/student/character')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
          >
            {t('viewCharacter')}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
          >
            {t('backToDashboard')}
          </button>
        </div>
      </div>
    </div>
  )
}
