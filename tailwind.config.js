/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        rosa: '#F7C6D0',
        creme: '#FFF6F0',
        lilas: '#D9C7F3',
        cinza: '#EAE4E1',
        rosaDeep: '#E8A0B0',
        lilasDeep: '#B8A0E0',
        texto: '#5A4A52',
        textoLight: '#8A7A82',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
