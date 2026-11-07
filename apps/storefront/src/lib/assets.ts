import fs from 'fs';
import path from 'path';

const IMAGE_EXT = /\.(png|jpe?g|webp|avif|svg|gif)$/i;

/**
 * Daftar nama file gambar di folder public/<dir>, urut berdasarkan nama
 * (angka diurutkan wajar: 2-promo sebelum 10-promo).
 * Hanya dipanggil di server. Kalau folder tidak ada, hasilnya daftar kosong.
 */
export function listPublicImages(dir: string): string[] {
  try {
    return fs
      .readdirSync(path.join(process.cwd(), 'public', dir))
      .filter((file) => IMAGE_EXT.test(file))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    return [];
  }
}

export function publicUrl(dir: string, file: string): string {
  return `/${dir}/${encodeURIComponent(file)}`;
}

/** Cari gambar dengan nama dasar tertentu (qris -> qris.png / qris.svg / ...). */
export function findPublicImage(dir: string, baseName: string): string | null {
  const match = listPublicImages(dir).find(
    (file) =>
      file.replace(IMAGE_EXT, '').toLowerCase() === baseName.toLowerCase()
  );

  return match ? publicUrl(dir, match) : null;
}
