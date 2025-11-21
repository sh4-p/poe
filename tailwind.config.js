/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/Views/**/*.twig",
    "./public/**/*.{html,js}",
    "./public/assets/js/**/*.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'poe': {
          'unique': '#af6025',
          'rare': '#ffff77',
          'magic': '#8888ff',
          'currency': '#aa9e82',
          'dark': '#0a0a0a',
          'darker': '#050505',
        }
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      }
    },
  },
  plugins: [],
}
