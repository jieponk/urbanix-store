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
        // Palet "Hitam keabuan + merah" (17 Nov 2026): merah #E30220, merah tua #BE0000, hitam keabuan #191919,
        // abu #DDDDDD, putih keabuan #F3F4F6. Identitas Urbanix tetap hitam-putih (sesuai logo). "brand" = warna tombol utama:
        // hitam di mode terang, putih di mode gelap. Teks di atasnya pakai `text-onbrand`.
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-50) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          dark: '#191919',
          accent: 'rgb(var(--brand-500) / <alpha-value>)',
        },
        onbrand: 'rgb(var(--onbrand) / <alpha-value>)',
        // Panel gelap (footer, header atas, kotak promo): hitam netral, sama di kedua mode
        cobalt: {
          700: '#2e2e2e',
          800: '#222222',
          900: '#191919',
        },
        // Sorotan (dulu kuning): merah terang, dipakai di atas panel hitam
        // 400 = merah palet (lencana/ikon besar); 300 = versi terang untuk TEKS kecil di atas panel gelap
        sun: {
          100: '#fdebed',
          300: '#ff5a6e',
          400: '#e30220',
        },
        // Sale Red: label diskon
        sale: {
          50: '#fdebed',
          600: '#e30220',
          700: '#be0000',
        },
        // Warna dasar yang berganti otomatis di mode gelap (lihat globals.css)
        // Merah editorial (Inspirasi & Berita); di mode gelap otomatis lebih terang
        ed: 'rgb(var(--ed) / <alpha-value>)',
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
