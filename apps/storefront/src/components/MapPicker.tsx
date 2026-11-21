'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Peta pilih titik lokasi (Leaflet 1.9.4, BSD-2 — github.com/Leaflet/Leaflet; peta OpenStreetMap).
 * Leaflet dimuat dari jsDelivr dengan hash integritas, hanya saat peta dibuka.
 */
const LEAFLET_JS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_JS_SRI = 'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH';
const LEAFLET_CSS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_CSS_SRI = 'sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H';
const JAKARTA = { lat: -6.1754, lng: 106.8272 };

export type LatLng = { lat: number; lng: number };

let loading: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = LEAFLET_CSS;
      css.integrity = LEAFLET_CSS_SRI;
      css.crossOrigin = 'anonymous';
      document.head.appendChild(css);
    }
    const js = document.createElement('script');
    js.src = LEAFLET_JS;
    js.integrity = LEAFLET_JS_SRI;
    js.crossOrigin = 'anonymous';
    js.async = true;
    js.onload = () => resolve(w.L);
    js.onerror = () => {
      loading = null;
      reject(new Error('Peta gagal dimuat.'));
    };
    document.head.appendChild(js);
  });
  return loading;
}

export default function MapPicker({
  value,
  center,
  onChange,
  labels,
  height = 280,
}: {
  value: LatLng | null;
  /** Posisi awal bila belum ada titik (mis. tengah kecamatan pembeli). */
  center?: LatLng | null;
  onChange: (point: LatLng) => void;
  labels?: { useMyLocation: string; hint: string; locating: string; denied: string; failed: string };
  height?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const L = labels ?? {
    useMyLocation: 'Pakai lokasi saya',
    hint: 'Geser pin atau ketuk peta tepat di lokasi.',
    locating: 'Mencari lokasi…',
    denied: 'Izin lokasi ditolak. Geser pin secara manual.',
    failed: 'Peta gagal dimuat. Coba muat ulang halaman.',
  };

  function place(point: LatLng, pan = true) {
    if (!map.current) return;
    const Lf = (window as any).L;
    if (!marker.current) {
      marker.current = Lf.marker([point.lat, point.lng], { draggable: true, autoPan: true }).addTo(map.current);
      marker.current.on('dragend', () => {
        const p = marker.current.getLatLng();
        changeRef.current?.({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) });
      });
    } else {
      marker.current.setLatLng([point.lat, point.lng]);
    }
    if (pan) map.current.setView([point.lat, point.lng], Math.max(map.current.getZoom(), 16));
  }

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((Lf) => {
        if (cancelled || !box.current || map.current) return;
        const start = value ?? center ?? JAKARTA;
        map.current = Lf.map(box.current, { scrollWheelZoom: false }).setView([start.lat, start.lng], value ? 17 : center ? 15 : 12);
        Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map.current);
        if (value) place(value, false);
        map.current.on('click', (e: any) => {
          const p = { lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) };
          place(p, false);
          changeRef.current?.(p);
        });
      })
      .catch(() => setError(L.failed));
    return () => {
      cancelled = true;
      if (map.current) {
        map.current.remove();
        map.current = null;
        marker.current = null;
      }
    };
    // Peta dibuat sekali; perubahan titik ditangani efek di bawah
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pusat kecamatan berubah & belum ada titik: pindahkan tampilan peta
  useEffect(() => {
    if (map.current && center && !value) map.current.setView([center.lat, center.lng], 15);
  }, [center?.lat, center?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (map.current && value) place(value, false);
  }, [value?.lat, value?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  function useMyLocation() {
    if (!navigator.geolocation) return setError(L.denied);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setError('');
        const p = { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) };
        place(p);
        onChange(p);
      },
      () => {
        setLocating(false);
        setError(L.denied);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{L.hint}</p>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-slate-200 disabled:opacity-60"
        >
          {locating ? L.locating : `◎ ${L.useMyLocation}`}
        </button>
      </div>
      <div ref={box} style={{ height }} className="relative z-0 w-full overflow-hidden rounded-xl ring-1 ring-slate-200" />
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
      {value && <p className="mt-1 text-[11px] text-slate-500 tabular-nums">{value.lat.toFixed(6)}, {value.lng.toFixed(6)}</p>}
    </div>
  );
}
