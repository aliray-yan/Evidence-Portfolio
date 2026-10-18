/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular']
      },
      colors: {
        ops: {
          bg: '#0F172A',
          panel: '#1E293B',
          line: '#334155'
        }
      },
      boxShadow: {
        soft: '0 18px 45px rgba(15, 23, 42, 0.18)'
      }
    }
  },
  plugins: []
};
