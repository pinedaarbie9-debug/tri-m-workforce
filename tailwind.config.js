/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#0A0A17',
          900: '#0F0F20',
          800: '#151529'
        },
        brand: {
          400: '#8B93FF',
          500: '#6C63FF',
          600: '#5A4FEE',
          700: '#4A3FD6'
        },
        cyan: {
          accent: '#4CC9F0'
        }
      },
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif']
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6C63FF 0%, #4CC9F0 100%)'
      }
    }
  },
  plugins: []
}
