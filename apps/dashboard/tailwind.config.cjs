/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        safe: {
          ink: '#07142B',
          midnight: '#0B1D3A',
          electric: '#FFC700',
          cloud: '#F8FAFC',
        },
      },
    },
  },
  plugins: [],
};

