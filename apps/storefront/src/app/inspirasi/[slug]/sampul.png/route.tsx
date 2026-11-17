import { ImageResponse } from 'next/og';
import { getArticle } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const W = 1200;
const H = 630;
const NAVY = '#1B2559';
const ACCENTS = ['#FF5B14', '#FFC93C', '#4FB3FF'];

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
 * Sampul otomatis artikel Inspirasi (1200×630, juga dipakai pratinjau link WA/IG/Google):
 * latar navy + aksen warna (berganti per artikel), judul, dan foto 1–3 produk terkait.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);
  if (!article) return Response.redirect(`${SITE_URL}/inspirasi/default-cover.jpg`, 302);

  const accent = ACCENTS[article.id % ACCENTS.length];
  const darkText = accent === '#FFC93C';
  const images = (article.related_products || [])
    .map((p) => p.image_url || p.images?.[0] || '')
    .filter(Boolean)
    .slice(0, 3)
    .map(abs);
  const title = article.title;
  const size = title.length > 90 ? 44 : title.length > 60 ? 52 : 60;
  const [bold, semi] = await Promise.all([font(800), font(600)]);
  const family = bold ? 'Jakarta' : undefined;

  // Posisi kartu produk: 1 besar, atau bertumpuk miring untuk 2–3 produk.
  const layouts: Record<number, { x: number; y: number; s: number; r: number }[]> = {
    1: [{ x: 70, y: 105, s: 400, r: -4 }],
    2: [
      { x: 30, y: 80, s: 300, r: -8 },
      { x: 190, y: 220, s: 300, r: 6 },
    ],
    3: [
      { x: 10, y: 60, s: 260, r: -10 },
      { x: 220, y: 40, s: 240, r: 8 },
      { x: 120, y: 270, s: 270, r: -2 },
    ],
  };
  const spots = layouts[images.length] || [];

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: 'flex',
          position: 'relative',
          background: NAVY,
          fontFamily: family,
          overflow: 'hidden',
        }}
      >
        {/* cahaya aksen */}
        <div
          style={{
            position: 'absolute',
            right: -160,
            top: -160,
            width: 760,
            height: 760,
            borderRadius: 9999,
            background: accent,
            opacity: 0.28,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: -120,
            bottom: -220,
            width: 420,
            height: 420,
            borderRadius: 9999,
            background: accent,
            opacity: 0.12,
            display: 'flex',
          }}
        />

        {/* teks */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: images.length ? 650 : 1080,
            padding: '64px 0 56px 64px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {article.category?.name && (
              <div
                style={{
                  display: 'flex',
                  alignSelf: 'flex-start',
                  padding: '10px 22px',
                  borderRadius: 9999,
                  background: accent,
                  color: darkText ? NAVY : '#fff',
                  fontSize: 24,
                  fontWeight: 800,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {article.category.name}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                marginTop: 28,
                color: '#fff',
                fontSize: size,
                fontWeight: 800,
                lineHeight: 1.12,
                letterSpacing: -1,
              }}
            >
              {title}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, color: '#fff', letterSpacing: 8 }}>URBANIX</div>
            <div style={{ display: 'flex', width: 6, height: 6, borderRadius: 9999, background: accent }} />
            <div style={{ display: 'flex', fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
              urbanix.id/inspirasi
            </div>
          </div>
        </div>

        {/* foto produk */}
        {images.length > 0 && (
          <div style={{ display: 'flex', position: 'relative', width: 550, height: H }}>
            {images.map((src, i) => {
              const p = spots[i];
              return (
                <div
                  key={src}
                  style={{
                    position: 'absolute',
                    left: p.x,
                    top: p.y,
                    width: p.s,
                    height: p.s,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fff',
                    borderRadius: 36,
                    transform: `rotate(${p.r}deg)`,
                    boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
                    padding: 18,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} width={p.s - 36} height={p.s - 36} style={{ objectFit: 'contain', borderRadius: 20 }} />
                </div>
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
