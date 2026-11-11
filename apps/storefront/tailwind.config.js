/** @type {import('tailwindcss').Config} */
module.exports = {
  // Mode gelap lewat class "dark" di <html> (diatur ThemeToggle + skrip di layout)
  darkMode: 'class',
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
          600: '#cf4309', // tombol: kontras teks putih ≥ 4.5
          700: '#b03905',
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
        // Warna dasar yang berganti otomatis di mode gelap (lihat globals.css)
        ink: 'rgb(var(--ink) / <alpha-value>)',
        mist: 'rgb(var(--mist) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        slate: {
          50: 'rgb(var(--slate-50) / <alpha-value>)',
          100: 'rgb(var(--slate-100) / <alpha-value>)',
          200: 'rgb(var(--slate-200) / <alpha-value>)',
          300: 'rgb(var(--slate-300) / <alpha-value>)',
          400: 'rgb(var(--slate-400) / <alpha-value>)',
          500: 'rgb(var(--slate-500) / <alpha-value>)',
          600: 'rgb(var(--slate-600) / <alpha-value>)',
          700: 'rgb(var(--slate-700) / <alpha-value>)',
          800: 'rgb(var(--slate-800) / <alpha-value>)',
          900: 'rgb(var(--slate-900) / <alpha-value>)',
          950: 'rgb(var(--slate-950) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
