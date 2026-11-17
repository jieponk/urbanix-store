import { ImageResponse } from 'next/og';
import { getArticle } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const W = 1200;
const H = 630;

/** Palet yang sama dengan ikon kategori di beranda (public/categories/*.svg). */
const PALETTE: { match: RegExp; color: string }[] = [
  { match: /audio|mic/i, color: '#a78bfa' },
  { match: /action|360/i, color: '#ff6b6b' },
  { match: /lensa|filter/i, color: '#ffc93c' },
  { match: /memory|gadget|kartu/i, color: '#ffa94d' },
  { match: /aksesori/i, color: '#f06eaa' },
  { match: /streaming|video/i, color: '#4f8ef7' },
  { match: /lighting|lampu|studio/i, color: '#ffb020' },
  { match: /drone/i, color: '#4fd1c5' },
  { match: /tripod|stabilizer|gimbal/i, color: '#8bcb4a' },
  { match: /tas|case/i, color: '#f6893b' },
  { match: /webcam|komputer/i, color: '#7c83fd' },
  { match: /cctv|keamanan/i, color: '#34c38f' },
  { match: /kamera|camera/i, color: '#5bb5f9' },
];
const FALLBACK = ['#5bb5f9', '#a78bfa', '#ff6b6b', '#ffa94d', '#f06eaa', '#4fd1c5', '#8bcb4a', '#7c83fd'];

/** Font untuk label kecil (Plus Jakarta Sans); bila gagal diunduh, pakai font bawaan. */
const fonts = new Map<number, Promise<ArrayBuffer | null>>();
function font(weight: number) {
  if (!fonts.has(weight)) {
    fonts.set(
      weight,
      (async () => {
        try {
          const css = await (
            await fetch(`https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@${weight}`)
          ).text();
          const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
          return url ? await (await fetch(url)).arrayBuffer() : null;
        } catch {
          return null;
        }
      })()
    );
  }
  return fonts.get(weight)!;
}

const abs = (src: string) => (src.startsWith('http') ? src : `${SITE_URL}${src}`);

/** Gelapkan warna hex (untuk bayangan panjang). */
function shade(hex: string, amount = 0.16) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * (1 - amount));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}
/** Warna terang (kuning/oranye muda) butuh tulisan gelap supaya terbaca. */
function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.68;
}

/** Ukuran kartu putih tempat foto produk. */
const CARD = 400;
const CARD_R = 44;

/**
 * Latar gaya ikon datar: warna penuh + satu kartu putih bersudut tumpul + bayangan panjang miring.
 * Dibuat sebagai SVG supaya bayangannya rapi.
 */
function backdropSvg(color: string) {
  const x = (W - CARD) / 2;
  const y = (H - CARD) / 2;
  const L = 900;
  // Bayangan: sisi kanan-atas & kiri-bawah kartu ditarik 45° ke kanan bawah
  const shadow = `${x + CARD},${y} ${x + CARD + L},${y + L} ${x + L},${y + CARD + L} ${x},${y + CARD}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${color}"/>
  <polygon points="${shadow}" fill="${shade(color)}"/>
  <rect x="${x}" y="${y}" width="${CARD}" height="${CARD}" rx="${CARD_R}" fill="#ffffff"/>
</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`; // isi SVG hanya ASCII
}

/**
 * Sampul otomatis artikel Inspirasi (1200×630, juga pratinjau link WA/IG/Google).
 * Gaya ikon kategori: warna cerah datar + bayangan panjang, satu foto produk di kartu putih, tulisan minimal.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);
  if (!article) return Response.redirect(`${SITE_URL}/inspirasi/default-cover.jpg`, 302);

  const products = (article.related_products || []).filter((p) => p.image_url || p.images?.[0]);
  const images = products.slice(0, 1).map((p) => abs(p.image_url || p.images?.[0] || ''));
  const mainCat = products[0]?.category_name || article.title;
  const color = PALETTE.find((p) => p.match.test(mainCat))?.color || FALLBACK[article.id % FALLBACK.length];

  const bold = await font(800);
  const family = bold ? 'Jakarta' : undefined;
  const PHOTO = CARD - 56;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', fontFamily: family }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={backdropSvg(color)} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} />
        {images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[0]}
            width={PHOTO}
            height={PHOTO}
            style={{ position: 'absolute', left: (W - PHOTO) / 2, top: (H - PHOTO) / 2, objectFit: 'contain', borderRadius: CARD_R - 16 }}
          />
        )}

        {/* label kecil: kategori artikel & logo */}
        {article.category?.name && (
          <div
            style={{
              position: 'absolute',
              left: 48,
              bottom: 44,
              display: 'flex',
              padding: '12px 24px',
              borderRadius: 9999,
              background: '#ffffff',
              color: '#111111',
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            {article.category.name}
          </div>
        )}
        <div style={{ position: 'absolute', right: 52, bottom: 50, display: 'flex', fontSize: 30, fontWeight: 800, letterSpacing: 8, color: isLight(color) ? '#111111' : '#ffffff' }}>
          URBANIX
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: bold ? [{ name: 'Jakarta', data: bold, weight: 800 as const, style: 'normal' as const }] : undefined,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    }
  );
}
