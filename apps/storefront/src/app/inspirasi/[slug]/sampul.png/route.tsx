import { ImageResponse } from 'next/og';
import { getArticle } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const W = 1200;
const H = 630;
const INK = '#111111';
const RED = '#C8102E';
const PANEL = '#F2F2F2';

/** Font tebal untuk judul (Plus Jakarta Sans); bila gagal diunduh, pakai font bawaan. */
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

/**
 * Sampul otomatis artikel Inspirasi (1200×630, juga dipakai pratinjau link WA/IG/Google).
 * Gaya editorial hitam-putih: latar putih, judul hitam, garis merah tipis, foto produk di panel abu-abu muda.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);
  if (!article) return Response.redirect(`${SITE_URL}/inspirasi/default-cover.jpg`, 302);

  const images = (article.related_products || [])
    .map((p) => p.image_url || p.images?.[0] || '')
    .filter(Boolean)
    .slice(0, 3)
    .map(abs);
  const title = article.title;
  const hasImg = images.length > 0;
  const size = hasImg ? (title.length > 80 ? 46 : title.length > 55 ? 54 : 62) : title.length > 80 ? 60 : 72;
  const [bold, semi] = await Promise.all([font(800), font(600)]);
  const family = bold ? 'Jakarta' : undefined;
  const PANEL_W = 540;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', background: '#FFFFFF', fontFamily: family, borderTop: `14px solid ${INK}` }}>
        {/* teks */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: hasImg ? W - PANEL_W : W,
            padding: '56px 56px 48px 64px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', width: 84, height: 8, background: RED }} />
            {article.category?.name && (
              <div style={{ display: 'flex', marginTop: 22, color: RED, fontSize: 24, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase' }}>
                {article.category.name}
              </div>
            )}
            <div style={{ display: 'flex', marginTop: 16, color: INK, fontSize: size, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5 }}>
              {title}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, borderTop: '2px solid #E5E5E5', paddingTop: 22 }}>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: INK, letterSpacing: 8 }}>URBANIX</div>
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 600, color: '#6B6B6B' }}>urbanix.id/inspirasi</div>
          </div>
        </div>

        {/* foto produk */}
        {hasImg && (
          <div
            style={{
              display: 'flex',
              flexDirection: images.length === 2 ? 'column' : 'row',
              flexWrap: 'wrap',
              width: PANEL_W,
              height: H - 14,
              background: PANEL,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 36,
              gap: 20,
            }}
          >
            {images.map((src, i) => {
              const big = images.length === 1 ? 440 : images.length === 2 ? 250 : i === 0 ? 300 : 190;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} width={big} height={big} style={{ objectFit: 'contain', width: big, height: big }} />
              );
            })}
          </div>
        )}
      </div>
    ),
    {
      width: W,
      height: H,
      emoji: 'twemoji',
      fonts: bold
        ? [
            { name: 'Jakarta', data: bold, weight: 800 as const, style: 'normal' as const },
            ...(semi ? [{ name: 'Jakarta', data: semi, weight: 600 as const, style: 'normal' as const }] : []),
          ]
        : undefined,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    }
  );
}
