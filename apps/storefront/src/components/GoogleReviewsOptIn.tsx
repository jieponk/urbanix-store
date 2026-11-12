'use client';

import { useEffect } from 'react';
import { siteConfig } from '@/lib/siteConfig';

/**
 * Google Customer Reviews (Merchant Center): tawaran survei dari Google setelah pembeli memesan.
 * Email pembeli TIDAK diambil dari server (halaman status pesanan bisa dibuka siapa saja yang tahu nomornya);
 * hanya dari sessionStorage yang diisi formulir checkout di browser yang sama, lalu langsung dihapus.
 */
export default function GoogleReviewsOptIn({ orderNumber }: { orderNumber: string }) {
  useEffect(() => {
    let saved: { order?: string; email?: string } = {};
    try {
      saved = JSON.parse(sessionStorage.getItem('urbanix_gcr') || '{}');
    } catch {
      return;
    }
    if (saved.order !== orderNumber || !saved.email) return;
    try {
      sessionStorage.removeItem('urbanix_gcr');
    } catch {
      /* abaikan */
    }

    const { merchantId, processingDaysMax, transitDaysMax } = siteConfig.googleCustomerReviews;
    const eta = new Date(Date.now() + (processingDaysMax + transitDaysMax) * 864e5);
    const w = window as unknown as { renderOptIn?: () => void; gapi?: any };
    w.renderOptIn = () => {
      w.gapi.load('surveyoptin', () => {
        w.gapi.surveyoptin.render({
          merchant_id: merchantId,
          order_id: orderNumber,
          email: saved.email,
          delivery_country: 'ID',
          estimated_delivery_date: eta.toISOString().slice(0, 10),
        });
      });
    };
    const s = document.createElement('script');
    s.src = 'https://apis.google.com/js/platform.js?onload=renderOptIn';
    s.async = true;
    s.defer = true;
    document.body.appendChild(s);
  }, [orderNumber]);

  return null;
}
