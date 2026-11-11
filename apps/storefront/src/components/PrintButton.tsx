'use client';

/** Tombol cetak/simpan PDF (memakai dialog cetak browser). */
export default function PrintButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {children}
    </button>
  );
}
