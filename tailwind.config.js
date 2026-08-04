/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#522582',
          pink: '#d9428f'
        },
        bg: {
          base: '#0d0b14',
          surface: '#161222',
          elevated: '#1e1830',
          border: '#2d2545'
        },
        text: {
          primary: '#f0edf8',
          muted: '#7c6fa0',
          dim: '#4a3d6b'
        },
        success: '#4ade80',
        warning: '#fb923c',
        error: '#f87171',
        ink: {
          cyan: '#22d3ee',
          magenta: '#f472b6',
          yellow: '#facc15',
          black: '#94a3b8',
          white: '#e2e8f0',
          varnish: '#818cf8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
