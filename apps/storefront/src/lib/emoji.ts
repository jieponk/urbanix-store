/**
 * Emoji bergerak dari Noto Animated Emoji (Google, lisensi CC BY 4.0):
 * https://googlefonts.github.io/noto-emoji-animation
 */
export const REACTIONS = ['❤️', '😂', '😍', '😮', '😢', '🔥', '👍'];

/** Emoji pilihan untuk ditulis di komentar (semua tersedia versi bergerak). */
export const EMOJIS = [
  '😀', '😆', '😂', '🤣', '😊', '😍', '🥰', '😘',
  '😎', '🤩', '🥳', '😇', '😅', '😋', '🤤', '🤗',
  '🤔', '😮', '😳', '🤯', '😢', '😭', '😡', '😴',
  '💀', '👀', '👍', '👏', '🙌', '🙏', '💪', '🫶',
  '❤️', '🔥', '💯', '✨', '⭐', '🎉', '📸',
];

const KNOWN = new Set([...EMOJIS, ...REACTIONS]);

export function emojiCode(char: string) {
  return Array.from(char)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join('_');
}

export function emojiUrl(char: string, size: 512 | 128 = 512) {
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${emojiCode(char)}/${size}.webp`;
}

// Cocokkan emoji terpanjang dulu (mis. ❤️ = ❤ + FE0F)
const PATTERN = new RegExp(
  `(${[...KNOWN].sort((a, b) => b.length - a.length).map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  'gu'
);

/** Pecah teks menjadi bagian teks biasa dan emoji yang punya versi bergerak. */
export function splitEmoji(text: string): { emoji?: string; text?: string }[] {
  const out: { emoji?: string; text?: string }[] = [];
  for (const part of text.split(PATTERN)) {
    if (!part) continue;
    out.push(KNOWN.has(part) ? { emoji: part } : { text: part });
  }
  return out;
}
