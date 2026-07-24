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
        // Theme-driven tokens — values come from CSS variables so a
        // `.bright` / `.dark` scope can reskin every utility at once.
        // Primary backgrounds
        'bg-primary': 'var(--bg-primary)',     // page canvas
        'bg-secondary': 'var(--bg-secondary)', // default card body
        'bg-surface': 'var(--bg-surface)',     // card hover / input
        'bg-elevated': 'var(--bg-elevated)',   // raised / pressed

        // Accent colors — violet / blue brand
        'accent-primary': 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
        'accent-gold': 'var(--accent-gold)',
        'accent-gem': 'var(--accent-gem)',
        'accent-cookie': 'var(--accent-cookie)',

        // Semantic colors
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',

        // Text colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',

        // Border colors
        'border-default': 'var(--border-default)',
        'border-focus': 'var(--border-focus)',

        // Shadcn/ui foreground & semantic tokens
        'primary-foreground': 'var(--primary-foreground, #ffffff)',
        'secondary-foreground': 'var(--secondary-foreground, #f5f7ff)',
        'destructive': 'var(--color-error)',
        'destructive-foreground': 'var(--destructive-foreground, #ffffff)',
        'accent-foreground': 'var(--accent-foreground, #f5f7ff)',
        'accent': 'var(--bg-surface)',        // card hover bg — used for ghost hover
        'background': 'var(--bg-secondary)',  // card surface
        'foreground': 'var(--text-primary)',  // default text
        'input': 'var(--input, rgba(91, 141, 255, 0.20))',
        'ring': 'var(--border-focus)',

        // Surface aliases (used by some layouts/UI components)
        'surface-base': 'var(--bg-primary)',
        'surface-elevated': 'var(--bg-secondary)',
        'text-subtle': 'var(--text-subtle, #5b6093)',
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
