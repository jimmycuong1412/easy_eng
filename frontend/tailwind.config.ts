import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary backgrounds — Direction C (deep indigo canvas)
        'bg-primary': '#060f33',     // page canvas
        'bg-secondary': '#0d1a4a',   // default card body
        'bg-surface': '#15235e',     // card hover / input
        'bg-elevated': '#1d2e75',    // raised / pressed

        // Accent colors — violet / blue brand
        'accent-primary': '#7c5cff',  // violet
        'accent-secondary': '#4c6bff', // blue
        'accent-gold': '#fbbf24',     // amber (bestseller / cert badges)
        'accent-gem': '#ec4899',      // pink (gem accent stays warm)
        'accent-cookie': '#ff7a59',   // coral (discount/urgency)

        // Semantic colors
        success: '#34d399',
        warning: '#fbbf24',
        error: '#ef4444',

        // Text colors — light-on-dark
        'text-primary': '#f5f7ff',
        'text-secondary': '#c8ccea',
        'text-muted': '#8a90b8',

        // Border colors — blue-tinted, never neutral
        'border-default': 'rgba(91, 141, 255, 0.13)',
        'border-focus': '#7c5cff',

        // Shadcn/ui foreground & semantic tokens (navy-friendly)
        'primary-foreground': '#ffffff',
        'secondary-foreground': '#f5f7ff',
        'destructive': '#ef4444',
        'destructive-foreground': '#ffffff',
        'accent-foreground': '#f5f7ff',
        'accent': '#15235e',          // card hover bg — used for ghost hover
        'background': '#0d1a4a',      // card surface
        'foreground': '#f5f7ff',      // default text
        'input': 'rgba(91, 141, 255, 0.20)',
        'ring': '#7c5cff',

        // Surface aliases (used by some layouts/UI components)
        'surface-base': '#060f33',
        'surface-elevated': '#0d1a4a',
        'text-subtle': '#5b6093',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #7c5cff 0%, #4c6bff 100%)',
        'gradient-brand-text':
          'linear-gradient(120deg, #a48bff 0%, #7c5cff 50%, #4c6bff 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 0.6s ease-out',
        'xp-gain': 'xpGain 0.8s ease-out forwards',
        'level-up': 'levelUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        skeleton: 'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 92, 255, 0.35)' },
          '50%': { boxShadow: '0 0 40px rgba(124, 92, 255, 0.65)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        xpGain: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.8)' },
          '25%': { opacity: '1', transform: 'translateY(0) scale(1.2)' },
          '75%': { opacity: '1', transform: 'translateY(-20px) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-40px) scale(0.8)' },
        },
        levelUp: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        skeleton: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      transitionDuration: {
        instant: '50ms',
        fast: '150ms',
        normal: '250ms',
        slow: '400ms',
        slower: '600ms',
      },
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.33, 1, 0.68, 1)',
        'ease-in-out-expo': 'cubic-bezier(0.65, 0, 0.35, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        pixel: ['var(--font-pixel)', 'monospace'],
      },
      boxShadow: {
        // Direction C — violet bloom + soft white inner highlight
        glow: '0 8px 24px -8px rgba(124, 92, 255, 0.50)',
        'glow-lg': '0 20px 40px -20px rgba(124, 92, 255, 0.60)',
        'glow-gold': '0 4px 12px -4px rgba(251, 191, 36, 0.50)',
        'glow-cookie': '0 6px 18px rgba(255, 122, 89, 0.45)',
        'card-hover': '0 20px 40px -20px rgba(124, 92, 255, 0.60)',
      },
    },
  },
  plugins: [],
};

export default config;
