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
        framer: {
          bg: 'var(--bg-app, #0B0F19)',
          card: 'var(--bg-card, #0F172A)',
          surface: 'var(--bg-surface, #1E293B)',
          elevated: 'var(--bg-elevated, #1E293B)',
          subtle: 'var(--border-subtle, #1E293B)',
          border: 'var(--border-muted, #334155)',
          borderHover: 'var(--border-strong, #475569)',
          text: 'var(--text-primary, #F8FAFC)',
          textSecondary: 'var(--text-secondary, #E2E8F0)',
          muted: 'var(--text-muted, #94A3B8)',
          accent: '#0066FF',
          accentGlow: 'rgba(0, 102, 255, 0.15)',
          amber: '#F5A623',
          emerald: '#10B981',
          rose: '#FF453A',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};

export default config;
