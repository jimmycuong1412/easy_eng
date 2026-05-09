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
        // Primary backgrounds — remapped to Editorial Direction A (warm paper)
        'bg-primary': '#F7F4ED',     // warm paper (was dark navy)
        'bg-secondary': '#EFEAE0',   // paper-2
        'bg-surface': '#FBF9F4',     // card paper
        'bg-elevated': '#EFEAE0',    // paper-2 (was elevated dark)

        // Accent colors — remapped to editorial ink + coral
        'accent-primary': '#0B2A6B', // dark navy ink
        'accent-secondary': '#2A3F7A', // ink-soft
        'accent-gold': '#B5832A',    // muted gold ok on paper
        'accent-gem': '#C44E22',     // coral-deep (gem stays warm)
        'accent-cookie': '#C44E22',

        // Semantic colors (kept; tuned slightly for paper background)
        success: '#1F8A55',
        warning: '#B27514',
        error: '#B23A3A',

        // Text colors — remapped to editorial ink
        'text-primary': '#0A1F4F',   // ink-2 (was white)
        'text-secondary': '#2A3F7A', // ink-soft
        'text-muted': '#5C6A92',     // ink-mute

        // Border colors — remapped to subtle paper rules
        'border-default': 'rgba(42,42,42,0.15)',
        'border-focus': '#0B2A6B',

        // Shadcn/ui foreground & semantic tokens (paper-friendly)
        'primary-foreground': '#F4EFE2',     // cream — text on dark navy buttons
        'secondary-foreground': '#0A1F4F',   // ink-2 — text on paper buttons
        'destructive': '#B23A3A',
        'destructive-foreground': '#FBF9F4',
        'accent-foreground': '#0A1F4F',
        'accent': '#EFEAE0',                 // paper-2 — used for ghost hover
        'background': '#FBF9F4',             // card paper
        'foreground': '#0A1F4F',             // ink-2 default text
        'input': 'rgba(42,42,42,0.18)',
        'ring': '#0B2A6B',

        // Surface aliases (used by some layouts/UI components)
        'surface-base': '#F7F4ED',
        'surface-elevated': '#FBF9F4',
        'text-subtle': '#5C6A92',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #F7F4ED 0%, #EFEAE0 100%)',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
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
        // Soft warm-paper-friendly shadows (was dark-mode glow)
        glow: '0 8px 22px rgba(11, 42, 107, 0.08)',
        'glow-lg': '0 16px 40px rgba(11, 42, 107, 0.12)',
        'glow-gold': '0 6px 18px rgba(196, 78, 34, 0.18)',
        'glow-cookie': '0 6px 18px rgba(196, 78, 34, 0.18)',
        'card-hover': '0 12px 28px rgba(11, 42, 107, 0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
