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

  const img = (part: string, className: string) =>
    tone === 'light' ? (
      <img src={`/brand/urbanix-${part}-light.png`} alt="" className={`${className} w-auto`} />
    ) : (
      <>
        <img src={`/brand/urbanix-${part}-dark.png`} alt="" className={`${className} w-auto dark:hidden`} />
        <img src={`/brand/urbanix-${part}-light.png`} alt="" className={`${className} hidden w-auto dark:block`} />
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
