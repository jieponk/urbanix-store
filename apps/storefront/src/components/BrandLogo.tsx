/**
 * Logo Urbanix dari public/brand (simbol U + URBANIX + "Capture Your Style").
 * Versi hitam untuk latar terang, versi putih untuk latar gelap.
 *  - tone="auto"  : ikut mode terang/gelap (header)
 *  - tone="light" : selalu putih (footer, panel gelap)
 */
export default function BrandLogo({
  tone = 'auto',
  showTagline = true,
  size = 'md',
}: {
  tone?: 'auto' | 'light';
  showTagline?: boolean;
  size?: 'md' | 'lg';
}) {
  const mark = size === 'lg' ? 'h-12' : 'h-9 sm:h-10';
  const word = size === 'lg' ? 'h-6' : 'h-[17px] sm:h-5';
  const tag = size === 'lg' ? 'h-3' : 'h-[9px] sm:h-2.5';

  // Ukuran asli file (dipakai browser untuk menyiapkan ruang sebelum gambar dimuat).
  const DIM: Record<string, [number, number]> = { mark: [136, 150], wordmark: [346, 72], tagline: [306, 36] };
  const img = (part: string, className: string) =>
    tone === 'light' ? (
      <img src={`/brand/urbanix-${part}-light.webp`} alt="" width={DIM[part][0]} height={DIM[part][1]} className={`${className} w-auto`} />
    ) : (
      <>
        <img src={`/brand/urbanix-${part}-dark.webp`} alt="" width={DIM[part][0]} height={DIM[part][1]} className={`${className} w-auto dark:hidden`} />
        <img src={`/brand/urbanix-${part}-light.webp`} alt="" width={DIM[part][0]} height={DIM[part][1]} className={`${className} hidden w-auto dark:block`} />
      </>
    );

  return (
    <span className="flex items-center gap-2.5" role="img" aria-label="Urbanix, Capture Your Style">
      {img('mark', mark)}
      <span className="flex flex-col justify-center gap-1">
        {img('wordmark', word)}
        {showTagline && img('tagline', tag)}
      </span>
    </span>
  );
}
