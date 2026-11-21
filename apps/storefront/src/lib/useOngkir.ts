'use client';

import { useEffect, useMemo, useState } from 'react';
import { norm } from '@/lib/wilayah';

export type Destination = {
  id: string;
  label: string;
  subdistrict: string;
  district: string;
  city: string;
  province: string;
  zip_code: string;
};

export type Rate = {
  code: string; // "jne:reg"
  courier: string;
  courier_name: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
  instant?: boolean;
};

type Region = { village: string; district: string; city: string; postal_code: string };
type Item = { product_id: number; variation_id: string; quantity: number };

/** Nilai kecocokan area Biteship dengan alamat yang diisi pembeli. */
function score(d: Destination, r: Region) {
  let s = 0;
  if (r.village && norm(d.subdistrict) === norm(r.village)) s += 4;
  if (r.district && norm(d.district) === norm(r.district)) s += 3;
  if (r.city && norm(d.city).includes(norm(r.city).replace(/^(kota|kabupaten|kab) /, ''))) s += 2;
  if (r.postal_code && d.zip_code === r.postal_code) s += 1;
  return s;
}

/**
 * Ongkir otomatis (Biteship): cari ID area tujuan dari alamat yang sudah diisi (kode pos / kelurahan / kecamatan),
 * lalu ambil tarif kurir untuk isi keranjang.
 */
export function useOngkir(enabled: boolean, region: Region, items: Item[], pin: { lat: number; lng: number } | null = null) {
  const [options, setOptions] = useState<Destination[]>([]);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const query = useMemo(() => {
    if (!enabled || !region.district.trim() || !region.city.trim()) return '';
    if (/^[0-9]{5}$/.test(region.postal_code)) return region.postal_code;
    // Area Biteship setingkat kecamatan + kode pos
    return region.district.trim();
  }, [enabled, region.district, region.city, region.postal_code, region.village]);

  // 1. Cari tujuan
  useEffect(() => {
    if (!query) {
      setOptions([]);
      setDestination(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        let list: Destination[] = [];
        const res = await fetch(`/api/ongkir/tujuan?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mencari tujuan.');
        list = data.results ?? [];
        // Kode pos tidak ketemu: coba nama kecamatan
        if (list.length === 0 && query !== region.district.trim()) {
          const res2 = await fetch(`/api/ongkir/tujuan?q=${encodeURIComponent(region.district.trim())}`);
          list = (await res2.json()).results ?? [];
        }
        if (cancelled) return;
        const ranked = [...list].sort((a, b) => score(b, region) - score(a, region));
        setOptions(ranked);
        setDestination(ranked[0] ?? null);
        setError(ranked.length ? '' : 'Alamat ini belum ditemukan di data ongkir. Periksa kecamatan & kode pos.');
      } catch (err) {
        if (!cancelled) {
          setOptions([]);
          setDestination(null);
          setError((err as Error).message);
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // region dibaca untuk peringkat; query sudah mewakili perubahan pentingnya
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, region.village, region.district]);

  // 2. Tarif kurir
  const itemsKey = JSON.stringify(items);
  useEffect(() => {
    if (!destination || items.length === 0) {
      setRates([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/ongkir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            destination_id: destination.id,
            ...(pin && { latitude: pin.lat, longitude: pin.lng }),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menghitung ongkir.');
        if (cancelled) return;
        setRates(data.options ?? []);
        setError((data.options ?? []).length ? '' : 'Belum ada kurir yang melayani alamat ini.');
      } catch (err) {
        if (!cancelled) {
          setRates([]);
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination?.id, itemsKey, pin?.lat, pin?.lng]);

  return { options, destination, setDestination, rates, loading, error };
}
