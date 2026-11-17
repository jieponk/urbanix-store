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
/** Campur warna dengan putih (untuk latar lembut). */
function tint(hex: string, amount = 0.86) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v + (255 - v) * amount);
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

/**
 * Latar gaya ikon datar: lingkaran besar berwarna + lingkaran putih + bayangan panjang miring (dipotong lingkaran).
 * Dibuat sebagai SVG supaya potongan (clip) bayangannya rapi.
 */
function backdropSvg(color: string, extras: { x: number; y: number; r: number }[]) {
  const cx = W / 2;
  const cy = H / 2;
  const R = 268;
  const r = 168;
  const k = Math.SQRT1_2;
  const L = 700;
  const band = (x: number, y: number, rr: number) => {
    const p1 = [x + rr * k, y - rr * k];
    const p2 = [x - rr * k, y + rr * k];
    return `${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p2[0] + L * k},${p2[1] + L * k} ${p1[0] + L * k},${p1[1] + L * k}`;
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><clipPath id="c"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath></defs>
  <rect width="${W}" height="${H}" fill="${tint(color)}"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="${color}"/>
  <polygon points="${band(cx, cy - 4, r)}" fill="${shade(color)}" clip-path="url(#c)"/>
  <circle cx="${cx}" cy="${cy - 4}" r="${r}" fill="#ffffff"/>
  ${extras
    .map(
      (e) => `<polygon points="${band(e.x, e.y, e.r)}" fill="#000" fill-opacity="0.08" clip-path="url(#c)"/>
  <circle cx="${e.x}" cy="${e.y}" r="${e.r}" fill="#ffffff" stroke="${color}" stroke-width="6"/>`
    )
    .join('\n')}
</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`; // isi SVG hanya ASCII
}

/**
 * Sampul otomatis artikel Inspirasi (1200×630, juga pratinjau link WA/IG/Google).
 * Gaya sama dengan ikon kategori: warna cerah datar, bayangan panjang, foto produk di tengah, tulisan minimal.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);
  if (!article) return Response.redirect(`${SITE_URL}/inspirasi/default-cover.jpg`, 302);

  const products = (article.related_products || []).filter((p) => p.image_url || p.images?.[0]);
  const images = products.slice(0, 3).map((p) => abs(p.image_url || p.images?.[0] || ''));
  const mainCat = products[0]?.category_name || article.title;
  const color = PALETTE.find((p) => p.match.test(mainCat))?.color || FALLBACK[article.id % FALLBACK.length];

  // Produk ke-2 & ke-3: lingkaran kecil di tepi lingkaran besar
  const spots = [
    { x: W / 2 - 250, y: H / 2 + 150, r: 92 },
    { x: W / 2 + 255, y: H / 2 - 150, r: 92 },
  ].slice(0, Math.max(0, images.length - 1));

  const bold = await font(800);
  const family = bold ? 'Jakarta' : undefined;
  const MAIN = 168;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', fontFamily: family }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={backdropSvg(color, spots)} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} />

        {images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[0]}
            width={MAIN * 1.38}
            height={MAIN * 1.38}
            style={{ position: 'absolute', left: W / 2 - MAIN * 0.69, top: H / 2 - 4 - MAIN * 0.69, objectFit: 'contain' }}
          />
        )}
        {spots.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={images[i + 1]}
            width={s.r * 1.38}
            height={s.r * 1.38}
            style={{ position: 'absolute', left: s.x - s.r * 0.69, top: s.y - s.r * 0.69, objectFit: 'contain' }}
          />
        ))}

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
              background: '#111111',
              color: '#ffffff',
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            {article.category.name}
          </div>
        )}
        <div style={{ position: 'absolute', right: 52, bottom: 50, display: 'flex', fontSize: 30, fontWeight: 800, letterSpacing: 8, color: '#111111' }}>
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
