import { siteConfig } from '@/lib/siteConfig';

/** Alamat publik situs (untuk sitemap, RSS, canonical, Open Graph). Di server diisi lewat env SITE_URL. */
export const SITE_URL = (process.env.SITE_URL || 'https://urbanix.id').replace(/\/+$/, '');

/** Teks polos dari deskripsi produk (tanpa HTML/spasi berlebih), dipotong untuk meta description. */
export function plainText(text: string | null | undefined, max = 160) {
  const clean = (text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/* ---------------------------------------------------------------- Data terstruktur Google (JSON-LD) */

/** Merek yang dikenali dari nama produk (untuk "brand" di data produk Google). */
export const BRANDS = [
  'Sony', 'Canon', 'Nikon', 'Fujifilm', 'Panasonic', 'Lumix', 'DJI', 'GoPro', 'Insta360', 'Godox', 'RODE',
  'Sigma', 'Tamron', 'Zhiyun', 'Leica', 'OM System', 'Olympus', 'Hasselblad', 'Ricoh', 'Pentax', 'Blackmagic',
  'Saramonic', 'Boya', 'Ulanzi', 'SmallRig', 'Viltrox', 'Yongnuo', 'Samyang', 'Laowa', 'Aputure', 'Amaran',
  'Nanlite', 'Hollyland', 'SanDisk', 'Lexar', 'Peak Design', 'K&F Concept', 'K&F', 'Feiyu', 'Hohem', 'Moza',
  'Benro', 'Manfrotto', 'Joby', 'Synco', 'Comica', 'Deity', 'Shure', 'Elgato', 'Logitech', 'Anker', 'Ugreen',
  'Baseus', 'Kingston', 'Samsung', 'Xiaomi', 'Ezviz', 'Imou', 'TP-Link', 'Instax', 'Kodak', 'Vanguard', 'Yashica', 'Timekettle', 'PX',
  'Lowepro', 'Takara', '7Artisans', 'TTArtisan', 'Desview', 'Rokid', 'RayNeo', 'SBOX', 'CineTreak', 'Everbrait',
  'Feelworld', 'Enabot', 'Neewer', 'Plaud', 'Mova', 'Accsoon', 'Fotopro', 'Lomography', 'Medeli', 'iSnap',
  'Beike', 'Obsbot', 'Akaso', 'Avangarde', 'Escura', 'Tilta', 'Sirui', 'Nitecore', 'Maono', 'Fifine',
  'Tascam', 'Jupio',
];

export function detectBrand(name: string): string | undefined {
  // Merek = yang paling awal disebut di nama (mis. "Viltrox ... untuk Sony/Fujifilm" -> Viltrox).
  const text = ` ${name.replace(/^\s*URBANIX\s*-\s*/i, '').toLowerCase()} `;
  let best: { brand: string; at: number } | undefined;
  for (const brand of BRANDS) {
    const re = new RegExp(`[^a-z0-9]${brand.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^a-z0-9])`);
    const m = re.exec(text);
    if (m && (!best || m.index < best.at || (m.index === best.at && brand.length > best.brand.length))) {
      best = { brand, at: m.index };
    }
  }
  return best?.brand;
}

/** Nama produk tanpa awalan "URBANIX - " (nama toko sudah ada di judul halaman). */
export function cleanProductName(name: string) {
  return name.replace(/^\s*URBANIX\s*-\s*/i, '').trim();
}

/** Nama ringkas untuk kartu & saran pencarian: tanpa "URBANIX -" dan kata pengisi ala judul marketplace. */
export function cardProductName(name: string) {
  return cleanProductName(name)
    .replace(/\b(garansi\s+resmi|original\s+bergaransi|100%\s*original|ori\b)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s,/|-]+$/, '')
    .trim();
}

/** Nama untuk judul Google/Open Graph: tanpa bagian setelah " | " (spesifikasi ala judul Shopee). */
export function seoProductName(name: string) {
  return cardProductName(name).split(/\s+\|\s+/)[0].trim();
}

/** SKU yang layak ditampilkan: SKU impor "SHOPEE-<id>" bukan SKU toko → disembunyikan. */
export function publicSku(sku: string | null | undefined) {
  return sku && !/^SHOPEE-/i.test(sku) ? sku : '';
}

/**
 * Perbaiki kalimat garansi yang menyebut merek lain (sisa template, mis. Amaran "bergaransi resmi Plaud"):
 * merek setelah "garansi resmi" diganti merek produk bila keduanya merek yang dikenal dan berbeda.
 */
export function fixWarrantyBrand(text: string, productName: string) {
  const own = detectBrand(productName);
  if (!own) return text;
  return text.replace(/(garansi\s+resmi\s+)([A-Za-z0-9&]+(?:\s?360)?)/gi, (whole, lead: string, said: string) => {
    const known = BRANDS.find((b) => b.toLowerCase().replace(/\s/g, '') === said.toLowerCase().replace(/\s/g, ''));
    if (!known || known.toLowerCase() === own.toLowerCase()) return whole;
    return `${lead}${own}`;
  });
}

/** Potong teks di batas kata, maksimal `max` karakter. */
export function shorten(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '').replace(/[\s|,/-]+$/, '') + '…';
}

/** Aman disisipkan dalam <script type="application/ld+json">. */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') };
}

/** Identitas toko: nama, logo, kontak, alamat, dan akun resmi lain (Shopee). */
export function organizationJsonLd(opts: { whatsapp?: string; shopeeUrl?: string | null } = {}) {
  const { legal, contact } = siteConfig;
  const wa = (opts.whatsapp || contact.whatsappNumber || '').replace(/\D/g, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': `${SITE_URL}/#toko`,
    name: 'Urbanix Store',
    alternateName: 'URBANIX STORE',
    legalName: legal.company,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/urbanix-logo-dark.png`,
    image: `${SITE_URL}/brand/og-urbanix-v2.png`,
    description: siteConfig.motto,
    email: contact.email,
    ...(wa ? { telephone: `+${wa}` } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Jl. Kerekot Bundar XI No. 4, RT.8/RW.6, Pasar Baru',
      addressLocality: 'Sawah Besar, Jakarta Pusat',
      addressRegion: 'DKI Jakarta',
      postalCode: '10710',
      addressCountry: 'ID',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: contact.email,
      ...(wa ? { telephone: `+${wa}` } : {}),
      availableLanguage: ['id'],
      areaServed: 'ID',
    },
    ...(opts.shopeeUrl ? { sameAs: [opts.shopeeUrl] } : {}),
  };
}

/** Nama situs untuk hasil pencarian Google. */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#situs`,
    name: 'Urbanix Store',
    alternateName: ['URBANIX STORE', 'urbanix.id'],
    url: SITE_URL,
    inLanguage: 'id-ID',
    publisher: { '@id': `${SITE_URL}/#toko` },
  };
}

/** Jejak halaman (Beranda › Kategori › Halaman) untuk hasil pencarian. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}
