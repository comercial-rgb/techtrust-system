/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E8EDF5',
          100: '#C6D2E6',
          200: '#9BB2D4',
          300: '#7092C2',
          400: '#4F78B3',
          500: '#2B5EA7',
          600: '#1E4A8A',
          700: '#1B3A6B',
          800: '#142D54',
          900: '#0D1B2E',
        },
        accent: {
          50: '#FCEEEC',
          100: '#F5D1CC',
          200: '#EAA399',
          300: '#DF7566',
          400: '#D65240',
          500: '#C0392B',
          600: '#A63025',
          700: '#8C271F',
          800: '#721E19',
          900: '#581512',
        },
        success: {
          50: '#e8f5e9',
          100: '#c8e6c9',
          500: '#4caf50',
          600: '#43a047',
        },
        warning: {
          50: '#fff3e0',
          100: '#ffe0b2',
          500: '#ff9800',
          600: '#fb8c00',
        },
        danger: {
          50: '#ffebee',
          100: '#ffcdd2',
          500: '#f44336',
          600: '#e53935',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Cal Sans', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 0 0 1px rgba(0,0,0,.03), 0 2px 4px rgba(0,0,0,.05), 0 12px 24px rgba(0,0,0,.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
