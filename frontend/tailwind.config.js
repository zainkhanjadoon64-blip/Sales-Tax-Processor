/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          DEFAULT: '#2563eb',
          foreground: '#ffffff',
        },
        slate: {
          950: '#0f172a',
        },
        success: {
          500: '#10b981',
        },
        warning: {
          500: '#f59e0b',
        },
        danger: {
          500: '#ef4444',
          600: '#dc2626',
        },
        background: '#f8fafc',
        foreground: '#0f172a',
        card: '#ffffff',
        'card-foreground': '#0f172a',
        secondary: '#f8fafc',
        'secondary-foreground': '#0f172a',
        muted: '#f1f5f9',
        'muted-foreground': '#64748b',
        accent: '#dbeafe',
        'accent-foreground': '#1e40af',
        destructive: '#ef4444',
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#2563eb',
        chart: {
          1: '#2563eb',
          2: '#3b82f6',
          3: '#93c5fd',
          4: '#22c55e',
          5: '#f97316',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
