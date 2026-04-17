/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0a0e1a',
          surface: '#0f1629',
          border: '#1e2d4a',
          accent: '#00d4ff',
          green: '#00ff88',
          red: '#ff3366',
          yellow: '#ffcc00',
          purple: '#8b5cf6',
          muted: '#4a5568',
          text: '#e2e8f0',
          subtext: '#94a3b8',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}
