'use client';

import { useEffect, useState } from 'react';

/** Garis tipis di atas layar yang menunjukkan seberapa jauh artikel sudah dibaca. */
export default function ReadingProgress({ targetId }: { targetId: string }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      setPct(Math.max(0, Math.min(100, (-rect.top / Math.max(total, 1)) * 100)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [targetId]);
  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-1 print:hidden">
      <div className="h-full origin-left bg-gradient-to-r from-brand-500 to-sun-400" style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  );
}
