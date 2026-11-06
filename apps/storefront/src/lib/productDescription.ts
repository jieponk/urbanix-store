/**
 * Pembaca deskripsi produk (teks mentah hasil salin Shopee).
 *
 * Deskripsi Shopee formatnya beda-beda tiap produk: ada yang bernomor
 * ("1. Garansi Resmi ..."), ada yang berjudul ("Fitur :", "Includes :"),
 * ada yang hanya daftar poin. Fungsi ini memecahnya menjadi bagian yang
 * seragam supaya halaman detail produk selalu tersusun sama:
 *
 *   Deskripsi -> Garansi -> Key Feature -> Spesifikasi -> Isi dalam paket -> Varian
 *
 * Teks tidak pernah diubah isinya, hanya dipilah. Hanya dipakai di server.
 */

export type Block =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] };

export type SectionKind =
  | 'description'
  | 'warranty'
  | 'features'
  | 'specs'
  | 'included'
  | 'variants'
  | 'extra';

export type Section = {
  kind: SectionKind;
  /** Judul asli dari data (mis. nama varian paket), bila ada. */
  title?: string;
  blocks: Block[];
};

export type ParsedDescription = {
  description: Block[];
  warranty: Section[];
  features: Section[];
  specs: Section[];
  included: Section[];
  /** Nama varian yang terbaca dari teks (cadangan jika API tidak mengirim varian). */
  variants: string[];
  extras: Section[];
};

const KIND_PATTERNS: [Exclude<SectionKind, 'description' | 'extra'>, RegExp][] = [
  ['warranty', /^(garansi|warranty|guarantee|syarat\s*(claim|klaim))\b/],
  [
    'features',
    /^(key\s*feat\w*|(product\s*)?features?|fitur|keunggulan|kelebihan|highlights?|key\s*highlights?)\b/,
  ],
  [
    'included',
    /^(included?|includes?|items?\s*included|isi\s*(dalam\s*)?(paket|box|kemasan|boks)|dalam\s*(paket|box|kemasan)|paket\s*(penjualan|berisi|pembelian)|kelengkapan|packing\s*list|yang\s*anda\s*dapatkan|in\s*the\s*box|package\s*(contents?|includes?)|box\s*contents?|what'?s\s*in\s*the\s*box)\b/,
  ],
  ['variants', /^(available|tersedia|varian|variants?|variations?|pilihan\s*(warna|varian)|warna\s*tersedia|colou?rs?\s*available)\b/],
  [
    'specs',
    /^(spesifikasi|specifications?|specs?|technical\s*specs?|detail\s*produk|product\s*details?)\b/,
  ],
];

// Judul yang boleh memuat isi di baris yang sama, mis. "Includes : 1x Tas".
const INLINE_KINDS = new Set<SectionKind>(['included', 'variants', 'warranty']);

const BULLET_SYMBOL = /^\s*[•·▪▫●○■□◆◇►▶★☆✔✓✅☑√*>+]+\s*/;
const BULLET_DASH = /^\s*[-–—]+\s+/;
const BULLET_NUM = /^\s*\d{1,2}[.)]\s+/;

type Stripped = { text: string; bullet: boolean; numbered: boolean };

function stripBullet(line: string): Stripped {
  if (BULLET_NUM.test(line)) {
    return { text: line.replace(BULLET_NUM, '').trim(), bullet: true, numbered: true };
  }
  for (const re of [BULLET_SYMBOL, BULLET_DASH]) {
    if (re.test(line)) {
      return { text: line.replace(re, '').trim(), bullet: true, numbered: false };
    }
  }
  return { text: line.trim(), bullet: false, numbered: false };
}

function kindOf(head: string): SectionKind | null {
  const text = head.toLowerCase().trim();

  // 'Varian "Standard" Included :' adalah isi paket, bukan daftar varian
  if (/^(varian|variants?)\b.*\b(includes?|included|isi|paket)\b/.test(text)) {
    return 'included';
  }

  for (const [kind, re] of KIND_PATTERNS) {
    if (re.test(text)) return kind;
  }
  return null;
}

function cleanLine(raw: string): string {
  return raw
    .replace(/[​-‍﻿]/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/^\s*#+\s*/, '')
    .replace(/\s+$/, '');
}

function isDecorative(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return /^[\s=\-_*~.•·#|]{3,}$/.test(t);
}

function tidyTitle(text: string): string {
  return text
    .replace(/[★☆✔✓✅▶►◆■●]+/g, '')
    .replace(/\s*:\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ambil nama varian dari judul seperti: Included varian "Standard Package" */
function subTitle(head: string): string | undefined {
  const quoted = head.match(/["“”'‘’]([^"“”'‘’]{2,60})["“”'‘’]/);
  if (quoted) return quoted[1].trim();

  const rest = head
    .replace(
      /^(included?|includes?|isi\s*(dalam\s*)?(paket|box|kemasan|boks)|dalam\s*(paket|box|kemasan)|paket\s*(penjualan|berisi|pembelian)|kelengkapan|in\s*the\s*box|package\s*(contents?|includes?)|box\s*contents?|what'?s\s*in\s*the\s*box|varian|variants?)\b/i,
      ''
    )
    .replace(/^[\s\-–—:]+/, '')
    .replace(/^(varian|variant)\s*/i, '')
    .trim();

  return rest && rest.length <= 50 ? rest : undefined;
}

type Header = {
  kind: SectionKind | 'unknown';
  title: string;
  inline?: string;
  numbered: boolean;
  /** Pernyataan satu baris (mis. "Garansi Resmi 2 Tahun X"), bukan judul bagian. */
  statement?: boolean;
};

const LOOSE_HEADER_KINDS = new Set<SectionKind>([
  'included',
  'features',
  'specs',
  'variants',
]);

function detectHeader(
  raw: string,
  nextLine: string | undefined
): Header | null {
  const { text, bullet, numbered } = stripBullet(raw);
  if (!text) return null;

  const nextIsBullet = nextLine ? stripBullet(nextLine).bullet : false;
  const endsColon = /:\s*$/.test(text);

  // 1. Judul dengan isi di baris yang sama: "Includes : 1x Tas VEO BIB T25"
  const inline = text.match(/^([^:]{2,45}?)\s*:\s*(\S.*)$/);
  if (inline) {
    const kind = kindOf(inline[1]);
    if (kind && INLINE_KINDS.has(kind)) {
      return {
        kind,
        title: tidyTitle(inline[1]),
        inline: inline[2].trim(),
        numbered,
      };
    }
  }

  // 2. Judul yang diakhiri titik dua: "Fitur :", "Key Features:", "FITS:"
  if (endsColon && text.length <= 60) {
    const head = tidyTitle(text);
    if (!head) return null;
    const kind = kindOf(head);
    return { kind: kind ?? 'unknown', title: head, numbered };
  }

  // 3. Judul tanpa titik dua, tapi jelas judul: "1. Garansi Resmi PT. X 1 Tahun"
  // Poin berpoin biasa ("• Varian SE 01 compatible ...") bukan judul bagian.
  // Hanya baris bernomor ("2. Key Features") yang boleh jadi judul tanpa titik dua.
  if (text.length <= 70 && !/[.!]$/.test(text) && (!bullet || numbered)) {
    const kind = kindOf(text);
    const upper = text === text.toUpperCase() && /[A-Z]{3}/.test(text);

    // "Garansi Resmi 2 Tahun X" tanpa nomor dan titik dua = pernyataan satu baris
    if (kind === 'warranty' && !numbered && !bullet) {
      return { kind, title: tidyTitle(text), numbered, statement: true };
    }

    // "Included", "Packing List", "What's in the box?" berdiri sendiri
    const loose =
      !!kind &&
      !bullet &&
      LOOSE_HEADER_KINDS.has(kind) &&
      text.replace(/\?$/, '').length <= 40;

    if (kind && (numbered || upper || nextIsBullet || loose)) {
      return { kind, title: tidyTitle(text.replace(/\?$/, '')), numbered };
    }

    // 4. Judul bernomor biasa yang diikuti daftar: "2. Quality Control & Packing Aman"
    if (numbered && nextIsBullet) {
      return { kind: 'unknown', title: tidyTitle(text), numbered };
    }
  }

  return null;
}

type Builder = {
  kind: SectionKind;
  title?: string;
  blocks: Block[];
  pendingList: string[];
  /** Garansi satu baris: poin di bawahnya hanya ikut jika memang soal garansi. */
  soft?: boolean;
};

const WARRANTY_DETAIL =
  /garansi|warranty|service|servis|klaim|claim|resmi|official|distributor|tahun|bulan|year|month/i;

function newBuilder(kind: SectionKind, title?: string): Builder {
  return { kind, title, blocks: [], pendingList: [] };
}

function flushList(b: Builder) {
  if (b.pendingList.length > 0) {
    b.blocks.push({ type: 'list', items: b.pendingList });
    b.pendingList = [];
  }
}

function pushParagraph(b: Builder, text: string) {
  flushList(b);
  b.blocks.push({ type: 'p', text });
}

function finalize(b: Builder): Section {
  flushList(b);
  return { kind: b.kind, title: b.title, blocks: b.blocks };
}

const LIST_LIKE: SectionKind[] = [
  'warranty',
  'features',
  'specs',
  'included',
  'variants',
];

export function parseDescription(input: string | null | undefined): ParsedDescription {
  const lines = (input || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(cleanLine)
    .map((line) => (isDecorative(line) ? '' : line));

  const sections: Section[] = [];
  const descriptionTail: Block[] = [];

  let current = newBuilder('description');
  let afterBlank = false;
  let sawList = false;
  let sawBullet = false;
  let tailMode = false;

  const closeCurrent = () => {
    const section = finalize(current);
    if (section.blocks.length > 0 || section.title) sections.push(section);
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    if (!raw.trim()) {
      afterBlank = true;
      continue;
    }

    // cari baris berikutnya yang tidak kosong untuk membantu deteksi judul
    let next: string | undefined;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim()) {
        next = lines[j];
        break;
      }
    }

    const header = detectHeader(raw, next);

    if (header) {
      const insideList = LIST_LIKE.includes(current.kind);

      if (header.kind === 'unknown') {
        if (insideList && !header.numbered) {
          // sub-judul di dalam bagian yang sama, mis. "T25:" di bawah Spesifikasi
          closeCurrent();
          current = newBuilder(current.kind, header.title);
        } else {
          closeCurrent();
          current = newBuilder('extra', header.title);
        }
      } else {
        closeCurrent();
        const title =
          header.kind === 'included' || header.kind === 'variants'
            ? subTitle(header.title)
            : header.kind === 'warranty'
              ? header.title
              : undefined;
        current = newBuilder(header.kind, title);
        if (header.statement) current.soft = true;
      }

      tailMode = false;
      sawList = false;
      sawBullet = false;
      afterBlank = false;

      if (header.inline) {
        current.pendingList.push(header.inline);
      }
      continue;
    }

    const { text, bullet } = stripBullet(raw);
    if (!text) continue;

    // garansi satu baris: poin di bawahnya ikut hanya jika memang soal garansi
    if (current.soft) {
      if (bullet && WARRANTY_DETAIL.test(text)) {
        current.pendingList.push(text);
        afterBlank = false;
        continue;
      }
      closeCurrent();
      current = newBuilder('description');
      sawList = false;
      sawBullet = false;
      tailMode = false;
    }

    // teks biasa setelah daftar berpoin (atau paragraf panjang setelah daftar)
    // di bagian non-deskripsi = kalimat deskripsi, bukan bagian dari daftar
    if (
      current.kind !== 'description' &&
      afterBlank &&
      !bullet &&
      (sawBullet || (sawList && text.length >= 90))
    ) {
      tailMode = true;
    }

    if (tailMode) {
      descriptionTail.push({ type: 'p', text });
      afterBlank = false;
      continue;
    }

    if (bullet) {
      current.pendingList.push(text);
      sawList = true;
      sawBullet = true;
    } else if (
      LIST_LIKE.includes(current.kind) &&
      text.length <= 160
    ) {
      current.pendingList.push(text);
      sawList = true;
    } else {
      pushParagraph(current, text);
    }

    afterBlank = false;
  }

  closeCurrent();

  const result: ParsedDescription = {
    description: [],
    warranty: [],
    features: [],
    specs: [],
    included: [],
    variants: [],
    extras: [],
  };

  for (const section of sections) {
    switch (section.kind) {
      case 'description':
        result.description.push(...section.blocks);
        break;
      case 'warranty':
        result.warranty.push(section);
        break;
      case 'features':
        result.features.push(section);
        break;
      case 'specs':
        result.specs.push(section);
        break;
      case 'included':
        result.included.push(section);
        break;
      case 'variants':
        for (const block of section.blocks) {
          if (block.type === 'list') result.variants.push(...block.items);
          else result.variants.push(block.text);
        }
        break;
      default:
        result.extras.push(section);
    }
  }

  result.description.push(...descriptionTail);

  // Daftar poin tanpa judul di awal deskripsi = key feature (gaya umum Shopee)
  if (result.features.length === 0) {
    let bestIndex = -1;
    let bestSize = 2; // minimal 3 poin
    result.description.forEach((block, index) => {
      if (block.type === 'list' && block.items.length > bestSize) {
        bestIndex = index;
        bestSize = block.items.length;
      }
    });

    if (bestIndex >= 0) {
      const [block] = result.description.splice(bestIndex, 1);
      if (block.type === 'list') {
        result.features.push({
          kind: 'features',
          blocks: [{ type: 'list', items: block.items }],
        });
      }
    }
  }

  return result;
}

/** Garansi dari nama produk bila deskripsi tidak punya bagian garansi. */
export function warrantyFromName(name: string | null | undefined): boolean {
  return /garansi\s*resmi/i.test(name || '');
}

/** Pisahkan "Kunci : Nilai" untuk tampilan tabel spesifikasi. */
export function splitKeyValue(item: string): { key: string; value: string } | null {
  const match = item.match(/^([^:]{2,40}?)\s*:\s*(\S.*)$/);
  return match ? { key: match[1].trim(), value: match[2].trim() } : null;
}
