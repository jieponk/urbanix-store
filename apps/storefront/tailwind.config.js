/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Urbanix Orange: tombol utama & identitas toko
        brand: {
          50: '#fff4ed',
          100: '#ffe4d3',
          500: '#ff5b14',
          600: '#e64a0a',
          700: '#bf3a06',
          dark: '#1b2559',
          accent: '#ff5b14',
        },
        // Cobalt Night: panel promo, footer
        cobalt: {
          700: '#24307a',
          800: '#1b2559',
          900: '#121a42',
        },
        // Shutter Yellow: angka hitung mundur & sorotan promo
        sun: {
          100: '#fff4cc',
          300: '#ffdb6e',
          400: '#ffc93c',
        },
        // Sale Red: label diskon
        sale: {
          50: '#fdecee',
          600: '#e5243b',
          700: '#c01a2f',
        },
        ink: '#1c2030',
        mist: '#f3f5fa',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
