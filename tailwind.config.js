module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Noto Sans Armenian"', 'system-ui', 'sans-serif'] },
      colors: { stage: '#0e3b43', deep: '#082a30', coral: '#ff6b4a', a0: '#e5384f', a1: '#2f6fe0', a2: '#e8a317', a3: '#1f9d55' },
      keyframes: {
        pop: { '0%': { transform: 'scale(.4)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        rise: { '0%': { transform: 'translateY(24px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        fall: { '0%': { transform: 'translateY(-10vh) rotate(0)' }, '100%': { transform: 'translateY(110vh) rotate(720deg)' } }
      },
      animation: { pop: 'pop .35s ease-out', rise: 'rise .45s ease-out', fall: 'fall 3s linear infinite' }
    }
  },
  plugins: []
};
