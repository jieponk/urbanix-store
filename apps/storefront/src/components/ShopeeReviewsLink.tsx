/**
 * Link "baca ulasan di Shopee".
 * Link halaman penilaian (shopee.co.id/buyer/.../rating) hanya benar di website Shopee (PC).
 * Di HP link itu dibuka aplikasi Shopee sebagai profil akun, jadi di HP kita arahkan ke halaman toko
 * (aplikasi pasti membukanya dengan benar), lalu pembeli tinggal ketuk "Penilaian".
 */
export default function ShopeeReviewsLink({
  reviewsUrl,
  storeUrl,
  className,
  desktopLabel = 'Baca semua ulasan di Shopee',
  mobileLabel = 'Lihat ulasan di toko Shopee',
}: {
  reviewsUrl?: string | null;
  storeUrl?: string | null;
  className?: string;
  desktopLabel?: string;
  mobileLabel?: string;
}) {
  if (!reviewsUrl && !storeUrl) return null;
  const mobileHref = storeUrl || reviewsUrl!;
  const desktopHref = reviewsUrl || storeUrl!;
  return (
    <>
      <a href={mobileHref} target="_blank" rel="noopener noreferrer" className={`${className ?? ''} md:hidden`}>
        {mobileLabel}
      </a>
      <a href={desktopHref} target="_blank" rel="noopener noreferrer" className={`${className ?? ''} hidden md:inline`}>
        {desktopLabel}
      </a>
    </>
  );
}
