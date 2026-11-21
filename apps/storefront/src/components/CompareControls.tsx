'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useT } from '@/components/LangProvider';
import { getCompare, setCompare } from '@/lib/saved';

/** Tanpa ?ids= → ambil daftar bandingkan dari perangkat lalu muat ulang dengan ids. */
export function LoadCompareFromDevice() {
  const router = useRouter();
  useEffect(() => {
    const ids = getCompare();
    if (ids.length) router.replace(`/bandingkan?ids=${ids.join(',')}`);
  }, [router]);
  return null;
}

/** Simpan ids yang sedang dilihat ke perangkat (supaya link bandingkan yang dibagikan bisa dilanjutkan). */
export function SyncCompare({ ids }: { ids: number[] }) {
  useEffect(() => setCompare(ids), [ids]);
  return null;
}

export function RemoveFromCompare({ id, ids }: { id: number; ids: number[] }) {
  const t = useT();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        const next = ids.filter((n) => n !== id);
        setCompare(next);
        router.push(next.length ? `/bandingkan?ids=${next.join(',')}` : '/bandingkan?kosong=1');
      }}
      className="mt-2 text-xs font-semibold text-slate-500 underline hover:text-ink"
    >
      {t('Hapus')}
    </button>
  );
}
