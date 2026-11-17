import { ImageResponse } from 'next/og';

/**
 * Gambar pratinjau link pesanan (WhatsApp, dll.): tas belanja merah dengan simbol U Urbanix.
 * Tanpa data pribadi: hanya nomor pesanan (yang memang ada di link).
 */
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Pesanan Urbanix Store';

// Simbol U Urbanix (sama dengan components/BrandSvg.tsx, viewBox 284×313)
const MARK_OUTLINE =
  'M9.86 9.37H81.6V45.76H45.73V81.5H9.86ZM274.18 9.37H202.44V45.76H238.31V81.5H274.18ZM9.86 108.5H45.73V171.47A96.29 96.29 0 0 0 142.02 267.76A96.29 96.29 0 0 0 238.31 171.47V108.5H274.18V171.47A132.16 132.16 0 0 1 142.02 303.63A132.16 132.16 0 0 1 9.86 171.47Z';
const MARK_INNER = 'M81.6 64.25V171.47A60.42 60.42 0 0 0 142.02 231.89A60.42 60.42 0 0 0 202.44 171.47V64.25';

const RED = '#E30220';
const RED_DARK = '#BE0000';
const INK = '#191919';

export default function Image({ params }: { params: { orderNumber: string } }) {
  const raw = decodeURIComponent(params.orderNumber || '');
  const orderNo = /^[A-Za-z0-9-]{3,40}$/.test(raw) ? raw.toUpperCase() : '';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#F3F4F6', position: 'relative' }}>
        {/* Lingkaran aksen samar */}
        <div style={{ position: 'absolute', right: -160, top: -160, width: 560, height: 560, borderRadius: 999, background: '#ffffff' }} />

        {/* Tas belanja */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 560, height: '100%' }}>
          <svg width="380" height="430" viewBox="0 0 380 430">
            {/* bayangan */}
            <ellipse cx="190" cy="412" rx="150" ry="14" fill="rgba(0,0,0,0.10)" />
            {/* tali tas */}
            <path d="M120 140 V100 a70 70 0 0 1 140 0 V140" fill="none" stroke={INK} strokeWidth="22" strokeLinecap="round" />
            {/* badan tas */}
            <path d="M48 128 H332 L352 380 a26 26 0 0 1 -26 28 H54 a26 26 0 0 1 -26 -28 Z" fill={RED} />
            {/* lipatan atas */}
            <path d="M48 128 H332 L335 160 H45 Z" fill={RED_DARK} />
            {/* lubang tali */}
            <circle cx="120" cy="146" r="11" fill={INK} />
            <circle cx="260" cy="146" r="11" fill={INK} />
            {/* simbol U Urbanix */}
            <g transform="translate(118 190) scale(0.5)">
              <g fill="none" stroke="#ffffff" strokeWidth="13" strokeMiterlimit="10">
                <path d={MARK_OUTLINE} />
                <path d={MARK_INNER} />
              </g>
            </g>
          </svg>
        </div>

        {/* Teks */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: 70, flex: 1 }}>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: RED, letterSpacing: 4 }}>URBANIX STORE</div>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, color: INK, marginTop: 14, lineHeight: 1.05 }}>Pesanan kamu</div>
          {orderNo && (
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                marginTop: 22,
                padding: '10px 22px',
                borderRadius: 16,
                background: INK,
                color: '#ffffff',
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              {orderNo}
            </div>
          )}
          <div style={{ display: 'flex', fontSize: 30, color: '#555555', marginTop: 26, lineHeight: 1.35 }}>
            Cek status, total & invoice di urbanix.id
          </div>
        </div>
      </div>
    ),
    { ...size, headers: { 'Cache-Control': 'public, max-age=86400, immutable' } }
  );
}
