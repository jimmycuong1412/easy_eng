/**
 * Shared Tailwind preset — EasyEng editorial design tokens.
 *
 * Consumed by both apps so web (Tailwind) and mobile (NativeWind) render the
 * same colors. Only cross-platform-safe tokens live here (colors, radius,
 * font sizes). Web-only bits (CSS gradients, keyframe animations) stay in
 * apps/web/tailwind.config.ts.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Primary backgrounds — deep indigo canvas
        'bg-primary': '#060f33',
        'bg-secondary': '#0d1a4a',
        'bg-surface': '#15235e',
        'bg-elevated': '#1d2e75',

        // Accent colors — violet / blue brand
        'accent-primary': '#7c5cff',
        'accent-secondary': '#4c6bff',
        'accent-gold': '#fbbf24',
        'accent-gem': '#ec4899',
        'accent-cookie': '#ff7a59',

        // Semantic
        success: '#34d399',
        warning: '#fbbf24',
        error: '#ef4444',

        // Text — light-on-dark
        'text-primary': '#f5f7ff',
        'text-secondary': '#c8ccea',
        'text-muted': '#8a90b8',

        // Borders — blue-tinted
        'border-default': 'rgba(91, 141, 255, 0.13)',
        'border-focus': '#7c5cff',
      },
      borderRadius: {
        card: '16px',
        btn: '10px',
      },
    },
  },
};
