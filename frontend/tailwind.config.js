/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#FAF7F2',
          200: '#F4ECE1',
          300: '#EDE0CF',
          400: '#DCC8AD',
        },
        brand: {
          primary: '#FF5E1E',
          hover: '#E54E12',
          light: '#FFF0EA',
          dark: '#9A2B00',
        },
        platform: {
          zomato: '#E23744',
          swiggy: '#FC8019',
          toing: '#00B159',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(28, 25, 23, 0.05)',
        'card': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'elevated': '0 20px 40px -15px rgba(255, 94, 30, 0.15)',
      }
    },
  },
  plugins: [],
}
