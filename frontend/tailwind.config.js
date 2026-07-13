/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f6f3',
          100: '#f1f1ef',
          200: '#e9e9e7',
          300: '#dfdedb',
          400: '#c8c7c3',
          500: '#9b9a97',
          600: '#787774',
          700: '#5f5e5b',
          800: '#37352f',
          900: '#2f2e2b',
          950: '#191919',
        },
        brand: {
          50: '#eaf3fb',
          100: '#d3e7f8',
          200: '#a6cef0',
          300: '#79b5e8',
          400: '#4a9de1',
          500: '#2383e2',
          600: '#1a6dc0',
          700: '#15579b',
          800: '#114575',
          900: '#0d3555',
          950: '#082238',
        },
      },
    },
  },
  plugins: [],
}
