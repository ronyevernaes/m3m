import type { Config } from 'tailwindcss'

// Tailwind v4: theme tokens are defined via @theme in src/index.css
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
} satisfies Config
