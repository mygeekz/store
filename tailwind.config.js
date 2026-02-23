/** @type {import('tailwindcss').Config} */
module.exports = {
  // هم کلاس dark و هم data-theme="dark"
  darkMode: ["class", '[data-theme="dark"]'],

  content: [
    "./index.html",
    "./App.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./layouts/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./styles/**/*.{css,scss}", // برای themes.css
  ],

  safelist: [
    { pattern: /bg-gradient-to-(r|b)/ },
    { pattern: /from-(indigo|sky|emerald|amber|pink|blue|fuchsia|violet|slate|cyan|lime|rose|gray)-(400|500|600)/ },
    { pattern: /to-(indigo|sky|emerald|amber|pink|blue|fuchsia|violet|slate|cyan|lime|rose|gray)-(600|700)/ },
    { pattern: /ring-(indigo|cyan|teal|amber|rose|blue|fuchsia|violet|slate|emerald|gray)-(200|300)/ },
    { pattern: /ring-(indigo|cyan|teal|amber|rose|blue|fuchsia|violet|slate|emerald|gray)-(700|800)/, variants: ['dark'] },
    'bg-green-500','bg-blue-500','bg-purple-500','bg-teal-500','bg-gray-200',
  ],

  theme: {
    extend: {
      fontFamily: {
        vazir: ['Vazir', 'Tahoma', 'sans-serif'],
      },

      colors: {
        // متغیرهای پس‌زمینه و متن
        bg:       "rgb(var(--color-bg) / <alpha-value>)",
        surface:  "rgb(var(--color-surface) / <alpha-value>)",
        text:     "rgb(var(--color-text) / <alpha-value>)",
        muted:    "rgb(var(--color-muted) / <alpha-value>)",

        // 🎨 رنگ برند اصلی (Hue از StyleContext)
        primary: {
          // ✅ مقیاس رنگی «واقعی» و قابل تنظیم با StyleContext (Hue/Sat/Light)
          DEFAULT: "hsl(var(--primary-h) calc(var(--primary-s-num,90) * 1%) calc(var(--primary-l-num,50) * 1%))",
          50:  "hsl(var(--primary-h) calc(var(--primary-s-num,90) * 1%) 97%)",
          100: "hsl(var(--primary-h) calc(var(--primary-s-num,90) * 1%) 92%)",
          200: "hsl(var(--primary-h) calc(var(--primary-s-num,90) * 1%) 85%)",
          300: "hsl(var(--primary-h) calc(var(--primary-s-num,90) * 1%) 72%)",
          400: "hsl(var(--primary-h) calc(var(--primary-s-num,90) * 1%) 60%)",
          500: "hsl(var(--primary-h) calc(var(--primary-s-num,90) * 1%) calc(var(--primary-l-num,50) * 1%))",
          600: "hsl(var(--primary-h) calc(var(--primary-s-num,90) * 1%) calc((var(--primary-l-num,50) * 1%) - 6%))",
          700: "hsl(var(--primary-h) calc(var(--primary-s-num,90) * 1%) calc((var(--primary-l-num,50) * 1%) - 12%))",
          800: "hsl(var(--primary-h) calc(var(--primary-s-num,90) * 1%) calc((var(--primary-l-num,50) * 1%) - 18%))",
          900: "hsl(var(--primary-h) calc(var(--primary-s-num,90) * 1%) calc((var(--primary-l-num,50) * 1%) - 24%))",
        },

        // رنگ‌های مکمل اگر نیاز بود
        secondary: "rgb(var(--secondary) / <alpha-value>)",
        accent:    "rgb(var(--accent) / <alpha-value>)",

        // برای سازگاری عقب‌رو
        'glass-edge':       'rgba(255, 255, 255, 0.15)',
        'glass-bg':         'rgba(255, 255, 255, 0.1)',
        'glass-sidebar-bg': 'rgba(30, 41, 59, 0.6)',
        'glass-header-bg':  'rgba(30, 41, 59, 0.7)',

        // رنگ‌های قدیمی اگر هنوز جایی هاردکد بود
        'primary-fixed':   '#4f46e5',
        'secondary-fixed': '#10b981',
        'accent-fixed':    '#ec4899',
      },

      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },

      keyframes: {
        'gradient-shift': {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        'gradient-shift': 'gradient-shift 8s ease infinite',
      },
      boxShadow: {
        'soft-glow': '0 10px 30px rgba(244, 114, 182, 0.18)',
      },
    },
  },

  plugins: [],
};
