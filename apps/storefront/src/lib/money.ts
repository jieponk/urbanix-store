/** Format Rupiah (aman dipakai di komponen browser maupun server). */
export const money = (value: string | number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

/** 1200 -> "1,2 kg", 350 -> "350 g" (sama dengan backend shipping.weight_text). */
export function weightText(grams?: number | null) {
  if (!grams) return '';
  if (grams < 1000) return `${grams} g`;
  return `${(grams / 1000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} kg`;
}
