/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
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
        admin: {
          50: '#E8EDF5',
          100: '#C6D2E6',
          200: '#9BB2D4',
          300: '#7092C2',
          400: '#4F78B3',
          500: '#1E4A8A',
          600: '#1B3A6B',
          700: '#153058',
          800: '#102545',
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
      },
    },
  },
  plugins: [],
}
