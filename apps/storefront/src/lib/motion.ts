/**
 * Animasi halus (motion.dev). Library dimuat belakangan lewat import() supaya
 * tidak ikut bundle awal dan tidak memperlambat tampilnya halaman.
 */
type MotionModule = typeof import('motion');

let loading: Promise<MotionModule> | null = null;

/** Muat motion sekali saja; panggilan berikutnya memakai hasil yang sama. */
export function loadMotion(): Promise<MotionModule> {
  if (!loading) loading = import('motion');
  return loading;
}

/** true bila pengguna mematikan animasi di pengaturan perangkat. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
