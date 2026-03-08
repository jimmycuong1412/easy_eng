'use client'

// Page: Career Onboarding
// Description: Guides new students through career path selection
// Related to: Phase 10 - Character & Gamification System (T144)

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CareerSelection from '@/components/character/CareerSelection'
import { motion } from 'framer-motion'

interface CareerPath {
  id: string
  name: string
  slug: string
  description: string
  primary_color: string
  secondary_color: string
  base_health: number
  base_mana: number
  base_strength: number
  base_intelligence: number
  base_creativity: number
  base_charisma: number
}

export default function CareerOnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [careers, setCareers] = useState<CareerPath[]>([])
  const [selectedCareer, setSelectedCareer] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    loadCareers()
    checkExistingCareer()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCareers = async () => {
    try {
      const { data, error } = await supabase
        .from('career_paths')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (error) throw error
      setCareers(data || [])
    } catch (err) {
      console.error('Error loading careers:', err)
      setError('Failed to load career paths')
    }
  }

  const checkExistingCareer = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('student_careers')
        .select('career_id')
        .eq('student_id', user.id)
        .single()

      if (data && !error) {
        // Student already has a career selected
        router.push('/student/dashboard')
      }
    } catch (err) {
      // No existing career - continue with onboarding
      // No existing career found, continue onboarding
    }
  }

  const handleCareerSelect = (careerId: string) => {
    setSelectedCareer(careerId)
  }

  const handleContinue = () => {
    if (currentStep === 1 && selectedCareer) {
      setCurrentStep(2)
    } else if (currentStep === 2) {
      handleConfirmCareer()
    }
  }

  const handleConfirmCareer = async () => {
    if (!selectedCareer) return

    setIsLoading(true)
    setError(undefined)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create student career assignment
      const { error: careerError } = await supabase
        .from('student_careers')
        .insert({
          student_id: user.id,
          career_id: selectedCareer,
        })

      if (careerError) throw careerError

      // Initialize student character (if not already exists)
      const { error: characterError } = await supabase
        .from('student_characters')
        .insert({
          student_id: user.id,
          career_id: selectedCareer,
          xp_balance: 0,
          gold_balance: 0,
        })

      // Character might already exist, so we don't throw on conflict
      if (characterError && !characterError.message?.includes('duplicate')) {
        throw characterError
      }

      // Redirect to dashboard
      router.push('/student/dashboard?welcome=true')
    } catch (err: any) {
      console.error('Error confirming career:', err)
      setError(err.message || 'Failed to save career selection')
      setIsLoading(false)
    }
  }

  const selectedCareerData = careers.find((c) => c.id === selectedCareer)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#142844] to-[#0A1628] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-white' : 'text-gray-500'}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 1 ? 'bg-blue-500' : 'bg-gray-700'
                }`}
              >
                1
              </div>
              <span className="font-medium">Choose Career</span>
            </div>

            <div className="w-16 h-0.5 bg-gray-700" />

            <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-white' : 'text-gray-500'}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 2 ? 'bg-blue-500' : 'bg-gray-700'
                }`}
              >
                2
              </div>
              <span className="font-medium">Confirm</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-center">
            {error}
          </div>
        )}

        {/* Step 1: Career Selection */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <CareerSelection
              careers={careers}
              selectedCareer={selectedCareer}
              onSelect={handleCareerSelect}
              isLoading={isLoading}
            />

            <div className="mt-8 text-center">
              <button
                onClick={handleContinue}
                disabled={!selectedCareer || isLoading}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Confirmation */}
        {currentStep === 2 && selectedCareerData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
              <h2 className="text-3xl font-bold text-white text-center mb-6">
                Ready to Start Your Journey?
              </h2>

              <div
                className="p-6 rounded-lg mb-6"
                style={{
                  background: `linear-gradient(135deg, ${selectedCareerData.primary_color}20, ${selectedCareerData.secondary_color}20)`,
                }}
              >
                <div className="text-center mb-4">
                  <div
                    className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl mb-4"
                    style={{
                      backgroundColor: selectedCareerData.primary_color,
                      boxShadow: `0 4px 30px ${selectedCareerData.primary_color}40`,
                    }}
                  >
                    {selectedCareerData.slug === 'doctor' && '🩺'}
                    {selectedCareerData.slug === 'engineer' && '⚙️'}
                    {selectedCareerData.slug === 'warrior' && '⚔️'}
                    {selectedCareerData.slug === 'business' && '💼'}
                    {selectedCareerData.slug === 'artist' && '🎨'}
                    {selectedCareerData.slug === 'scientist' && '🔬'}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedCareerData.name}</h3>
                  <p className="text-gray-300">{selectedCareerData.description}</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <h4 className="font-semibold text-white">Career-Specific Growth</h4>
                    <p className="text-sm text-gray-400">
                      Your character will evolve with unique visuals and abilities based on your career
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">✨</span>
                  <div>
                    <h4 className="font-semibold text-white">Exclusive Items</h4>
                    <p className="text-sm text-gray-400">
                      Unlock special cosmetics and items designed for your career path
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <h4 className="font-semibold text-white">Compete on Leaderboards</h4>
                    <p className="text-sm text-gray-400">
                      Climb the ranks against others in your career path
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-200 text-center">
                  ⚠️ You can change your career path once per month in profile settings
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-semibold rounded-lg transition-all duration-200"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmCareer}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? 'Starting Journey...' : 'Confirm & Start'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
