import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';
import { getArticle } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const W = 1200;
const H = 630;

/**
 * Topik → warna + ikon (sama dengan ikon kategori di beranda, public/categories/*.svg).
 * Urutan penting: yang lebih spesifik di atas.
 */
const TOPICS: { match: RegExp; color: string; icon: string }[] = [
  { match: /audio|mic\b|mikrofon|hollyland|lark/i, color: '#a78bfa', icon: 'audio-mic' },
  { match: /action|360|insta360|osmo action|gopro/i, color: '#ff6b6b', icon: 'action-cam' },
  { match: /lensa|lens\b|filter|bokeh|portrait/i, color: '#ffc93c', icon: 'lensa-filter' },
  { match: /drone/i, color: '#4fd1c5', icon: 'drone' },
  { match: /tripod|stabilizer|gimbal/i, color: '#8bcb4a', icon: 'stabilizer-tripod' },
  { match: /lighting|lampu|studio/i, color: '#ffb020', icon: 'lighting-studio' },
  { match: /streaming|webcam/i, color: '#4f8ef7', icon: 'streaming-video' },
  { match: /memory|kartu memori|sd card|gadget/i, color: '#ffa94d', icon: 'memory-gadget' },
  { match: /tas|case|backpack/i, color: '#f6893b', icon: 'tas-case' },
  { match: /aksesori|gear|pemula|baterai/i, color: '#f06eaa', icon: 'aksesori-kamera' },
  { match: /kamera|camera|pocket|mirrorless|instax|full frame/i, color: '#5bb5f9', icon: 'kamera' },
];
const DEFAULT_TOPIC = { color: '#5bb5f9', icon: 'kamera' };

/** Isi gambar objek dari ikon kategori (bulatan & bayangan bawaannya dibuang). */
function iconBody(name: string): string {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'public', 'categories', `${name}.svg`), 'utf8');
    return raw
      .replace(/<\?xml[^>]*>/, '')
      .replace(/<svg[^>]*>/, '')
      .replace('</svg>', '')
      .replace(/<defs>[\s\S]*?<\/defs>/, '')
      .replace(/<circle cx="60" cy="60" r="58"[^>]*\/>/, '')
      .replace(/<polygon[^>]*clip-path="url\(#c\)"[^>]*\/>/, '');
  } catch {
    return '';
  }
}

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

/** Ukuran ikon di tengah sampul. */
const ICON = 420;

/**
 * Sampul gaya ikon datar: latar satu warna + ikon besar di tengah + bayangan panjang miring
 * yang jatuh dari bentuk ikon itu sendiri (siluet digeser 45° berulang kali).
 */
function coverSvg(color: string, body: string) {
  const x = (W - ICON) / 2;
  const y = (H - ICON) / 2;
  // Bayangan dibuat dengan penggandaan: tiap langkah menyalin hasil sebelumnya sejauh 2× → 7 langkah = 128 lapis
  // (hemat memori dibanding 128 lapis terpisah).
  const STEP = 8;
  const levels = Array.from({ length: 7 }, (_, i) => i);
  const icon = `<svg x="${x}" y="${y}" width="${ICON}" height="${ICON}" viewBox="18 18 84 84">${body}</svg>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><filter id="ls" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
    <feFlood flood-color="${shade(color)}"/><feComposite in2="SourceAlpha" operator="in" result="s"/>
    <feOffset in="s" dx="${STEP}" dy="${STEP}" result="r0"/>
    ${levels
      .slice(1)
      .map((i) => {
        const d = STEP * 2 ** (i - 1);
        return `<feOffset in="r${i - 1}" dx="${d}" dy="${d}" result="m${i}"/><feMerge result="r${i}"><feMergeNode in="r${i - 1}"/><feMergeNode in="m${i}"/></feMerge>`;
      })
      .join('')}
  </filter></defs>
  <rect width="${W}" height="${H}" fill="${color}"/>
  ${body ? `<g filter="url(#ls)">${icon}</g>${icon}` : ''}
</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`; // isi SVG hanya ASCII
}

/**
 * Sampul otomatis artikel Inspirasi (1200×630, juga pratinjau link WA/IG/Google).
 * Gaya ikon kategori: warna cerah datar, ikon sesuai topik + bayangan panjang, tanpa kotak & tulisan minimal.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);
  if (!article) return Response.redirect(`${SITE_URL}/inspirasi/default-cover.jpg`, 302);

  // Topik dari judul dulu; kalau tidak ketemu, dari kategori produk utama.
  const productCat = article.related_products?.[0]?.category_name || '';
  const topic =
    TOPICS.find((t) => t.match.test(article.title)) ||
    TOPICS.find((t) => t.match.test(productCat)) ||
    TOPICS.find((t) => t.match.test(article.tags.join(' '))) ||
    { ...DEFAULT_TOPIC, color: FALLBACK[article.id % FALLBACK.length] };
  const color = topic.color;

  const bold = await font(800);
  const family = bold ? 'Jakarta' : undefined;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', fontFamily: family }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverSvg(color, iconBody(topic.icon))} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} />
        <div
          style={{
            position: 'absolute',
            right: 48,
            bottom: 40,
            display: 'flex',
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: 8,
            color: isLight(color) ? 'rgba(17,17,17,0.75)' : 'rgba(255,255,255,0.9)',
          }}
        >
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
