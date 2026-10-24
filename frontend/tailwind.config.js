/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f5fa',
          100: '#e1ecf5',
          200: '#c3d9eb',
          300: '#95bde0',
          400: '#5f9cd0',
          500: '#387ec0',
          600: '#2864a3',
          700: '#215084',
          800: '#1e446e',
          900: '#0f294a',
          950: '#0a1a31',
        },
        brand: {
          blue: '#1e40af',
          indigo: '#4338ca',
          accent: '#0284c7',
          surface: '#0f172a',
          card: '#1e293b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
