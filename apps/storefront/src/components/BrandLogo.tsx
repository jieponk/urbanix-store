import { UrbanixMark, UrbanixTagline, UrbanixWordmark } from '@/components/BrandSvg';

/**
 * Logo Urbanix (simbol U + URBANIX + "Capture Your Style") dalam SVG langsung di halaman:
 * tajam di layar apa pun, tanpa unduhan gambar tambahan, warna ikut tema.
 *  - tone="auto"  : hitam di mode terang, putih di mode gelap (header)
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
  const color = tone === 'light' ? 'text-white' : 'text-[#111111] dark:text-white';

  return (
    <span className={`flex items-center gap-2.5 ${color}`} role="img" aria-label="Urbanix, Capture Your Style">
      <UrbanixMark className={`${mark} w-auto shrink-0`} />
      <span className="flex flex-col justify-center gap-1">
        <UrbanixWordmark className={`${word} w-auto`} />
        {showTagline && <UrbanixTagline className={`${tag} w-auto`} />}
      </span>
    </span>
  );
}
