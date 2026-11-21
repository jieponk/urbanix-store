'use client';

import { createContext, useContext, useMemo } from 'react';
import { type Lang, translator } from '@/lib/i18n';

const LangContext = createContext<Lang>('id');

/** Menyediakan bahasa aktif (dari cookie, dibaca di layout server) untuk komponen browser. */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

/** Fungsi terjemah untuk komponen browser: `const t = useT(); t('Keranjang')`. */
export function useT() {
  const lang = useLang();
  return useMemo(() => translator(lang), [lang]);
}
