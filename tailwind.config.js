/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/Views/**/*.twig",
    "./public/assets/js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'poe-dark': '#1a1a1a',
        'poe-brown': '#38250e',
        'poe-gold': '#af8551',
        'poe-unique': '#af5025',
        'poe-rare': '#ffff77',
        'poe-magic': '#8888ff',
        'poe-normal': '#c8c8c8',
        'poe-currency': '#aa9e82',
        'poe-gem': '#1ba29b',
        'poe-fire': '#ff6060',
        'poe-cold': '#6060ff',
        'poe-lightning': '#ffff60',
      },
      fontFamily: {
        'poe': ['Fontin', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
