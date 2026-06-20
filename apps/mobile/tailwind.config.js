/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind scans these for className usage.
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './App.tsx',
  ],
  // Shared editorial design tokens (colors, radius) — same as web.
  presets: [
    require('nativewind/preset'),
    require('@easyeng/config/tailwind-preset'),
  ],
  theme: { extend: {} },
  plugins: [],
};
