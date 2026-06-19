// Utility: Sprite Animation Helpers
// Description: Utilities for 8-bit character sprite animations (idle, level-up, etc.)
// Related to: Phase 10 - Character & Gamification System (T162)

export type AnimationType = 'idle' | 'levelUp' | 'celebrate' | 'wave' | 'think'

export interface AnimationFrame {
  offsetX: number // X offset in sprite sheet
  offsetY: number // Y offset in sprite sheet
  duration: number // Duration in milliseconds
}

export interface AnimationSequence {
  frames: AnimationFrame[]
  loop: boolean
  totalDuration: number
}

/**
 * Define animation sequences for different character states
 */
export const ANIMATION_SEQUENCES: Record<AnimationType, AnimationSequence> = {
  idle: {
    frames: [
      { offsetX: 0, offsetY: 0, duration: 500 },
      { offsetX: 64, offsetY: 0, duration: 500 },
      { offsetX: 128, offsetY: 0, duration: 500 },
      { offsetX: 64, offsetY: 0, duration: 500 },
    ],
    loop: true,
    totalDuration: 2000,
  },
  levelUp: {
    frames: [
      { offsetX: 0, offsetY: 64, duration: 100 },
      { offsetX: 64, offsetY: 64, duration: 100 },
      { offsetX: 128, offsetY: 64, duration: 100 },
      { offsetX: 192, offsetY: 64, duration: 100 },
      { offsetX: 256, offsetY: 64, duration: 100 },
      { offsetX: 320, offsetY: 64, duration: 100 },
      { offsetX: 384, offsetY: 64, duration: 100 },
      { offsetX: 448, offsetY: 64, duration: 100 },
    ],
    loop: false,
    totalDuration: 800,
  },
  celebrate: {
    frames: [
      { offsetX: 0, offsetY: 128, duration: 150 },
      { offsetX: 64, offsetY: 128, duration: 150 },
      { offsetX: 128, offsetY: 128, duration: 150 },
      { offsetX: 192, offsetY: 128, duration: 150 },
      { offsetX: 128, offsetY: 128, duration: 150 },
      { offsetX: 64, offsetY: 128, duration: 150 },
    ],
    loop: true,
    totalDuration: 900,
  },
  wave: {
    frames: [
      { offsetX: 0, offsetY: 192, duration: 200 },
      { offsetX: 64, offsetY: 192, duration: 200 },
      { offsetX: 128, offsetY: 192, duration: 200 },
      { offsetX: 64, offsetY: 192, duration: 200 },
      { offsetX: 0, offsetY: 192, duration: 200 },
    ],
    loop: false,
    totalDuration: 1000,
  },
  think: {
    frames: [
      { offsetX: 0, offsetY: 256, duration: 400 },
      { offsetX: 64, offsetY: 256, duration: 400 },
      { offsetX: 128, offsetY: 256, duration: 400 },
    ],
    loop: true,
    totalDuration: 1200,
  },
}

/**
 * Get the current frame index based on elapsed time
 */
export function getCurrentFrame(
  animationType: AnimationType,
  elapsedTime: number
): number {
  const sequence = ANIMATION_SEQUENCES[animationType]

  if (!sequence.loop && elapsedTime >= sequence.totalDuration) {
    return sequence.frames.length - 1 // Stay on last frame
  }

  const loopedTime = elapsedTime % sequence.totalDuration
  let accumulatedTime = 0

  for (let i = 0; i < sequence.frames.length; i++) {
    accumulatedTime += sequence.frames[i].duration
    if (loopedTime < accumulatedTime) {
      return i
    }
  }

  return 0
}

/**
 * Get sprite sheet position for a given frame
 */
export function getFramePosition(
  animationType: AnimationType,
  frameIndex: number
): { x: number; y: number } {
  const sequence = ANIMATION_SEQUENCES[animationType]
  const frame = sequence.frames[frameIndex] || sequence.frames[0]

  return {
    x: frame.offsetX,
    y: frame.offsetY,
  }
}

/**
 * Calculate particle effect positions for level-up celebration
 */
export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
}

export function generateLevelUpParticles(
  centerX: number,
  centerY: number,
  count: number = 20
): Particle[] {
  const particles: Particle[] = []
  const colors = ['#FFD700', '#FFA500', '#FF6347', '#FFE4B5', '#FFFF00']

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count
    const speed = 2 + Math.random() * 3

    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2, // Slight upward bias
      life: 1.0,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 4,
    })
  }

  return particles
}

/**
 * Update particle positions and life over time
 * deltaTime is expected in milliseconds
 */
export function updateParticles(particles: Particle[], deltaTime: number): Particle[] {
  const dt = deltaTime / 16.667; // Normalize to ~60fps baseline
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vy: p.vy + 0.2 * dt, // Gravity scaled by delta
      life: p.life - deltaTime / 1000,
    }))
    .filter((p) => p.life > 0)
}

/**
 * Ease-out animation curve
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Bounce animation curve
 */
export function easeOutBounce(t: number): number {
  const n1 = 7.5625
  const d1 = 2.75

  if (t < 1 / d1) {
    return n1 * t * t
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  }
}

/**
 * Calculate character scale based on level
 * Higher levels = slightly larger character (max 1.2x at level 50)
 */
export function getLevelScale(level: number): number {
  const maxLevel = 50
  const maxScale = 1.2
  const minScale = 1.0

  const normalizedLevel = Math.min(level, maxLevel) / maxLevel
  return minScale + (maxScale - minScale) * normalizedLevel
}

/**
 * Get glow intensity based on rarity
 */
export function getGlowIntensity(rarity: string): number {
  const intensities: Record<string, number> = {
    common: 0.1,
    uncommon: 0.2,
    rare: 0.3,
    epic: 0.4,
    legendary: 0.6,
  }

  return intensities[rarity] || 0.1
}
