import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './store/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: '#1D9E75',
        background: '#0e1513',
        cardBorder: '#293430',
        surface: '#161d1b',
        ink: '#dde4e0',
        muted: '#97a79f',
        danger: '#D64545',
        warning: '#D98B2B',
        panel: '#1a211f',
        panelHigh: '#242b29',
        panelLow: '#111816',
        line: '#3d4943',
        glow: '#68dbae',
        softText: '#bccac1'
      },
      borderRadius: {
        xl: '12px',
        lg: '8px'
      },
      boxShadow: {
        card: '0 10px 30px rgba(14, 53, 38, 0.06)'
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      fontSize: {
        body: ['13px', '20px'],
        label: ['15px', '22px'],
        title: ['20px', '28px'],
        stat: ['28px', '32px']
      },
      animation: {
        pulseRing: 'pulseRing 1.8s ease-out infinite',
        pulseSoft: 'pulseSoft 2s ease-in-out infinite'
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(0.92)', opacity: '0.8' },
          '70%': { transform: 'scale(1.08)', opacity: '0' },
          '100%': { transform: 'scale(1.08)', opacity: '0' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' }
        }
      }
    }
  },
  plugins: []
};

export default config;
