/**
 * Renderer Markdown kecil & aman untuk Artikel Urbanix (tanpa library luar).
 * Semua teks di-escape dulu, jadi HTML yang diketik penulis tidak ikut dijalankan.
 * Daftar lengkap format ada di FORMAT_GUIDE (ditampilkan juga di editor Seller Center).
 */

export type Block =
  | { type: 'html'; html: string }
  | { type: 'product'; id: string }
  | { type: 'youtube'; id: string };

export type Heading = { id: string; text: string; level: 2 | 3 };

export const DEFAULT_COVER = '/inspirasi/default-cover.webp';

/** Contekan format (nama, cara tulis). Dipakai di editor Seller Center. */
export const FORMAT_GUIDE: { group: string; items: [string, string][] }[] = [
  { group: 'Judul', items: [['Judul besar', '# Judul besar'], ['Judul bagian', '## Judul bagian'], ['Sub-judul', '### Sub-judul'], ['Judul kecil', '#### Judul kecil']] },
  {
    group: 'Teks',
    items: [
      ['Tebal', '**teks**'], ['Miring', '*teks*'], ['Coret', '~~teks~~'], ['Sorot', '==teks=='], ['Kode', '`kode`'],
      ['Spoiler', '||rahasia||'], ['Tombol keyboard', '++Ctrl+C++'], ['Label kecil', '[[label:Baru]]'], ['Rating', '[[rating:4.5]]'],
      ['Link', '[teks](https://…)'],
    ],
  },
  {
    group: 'Blok',
    items: [
      ['Daftar', '- poin\n  - sub-poin'], ['Daftar nomor', '1. langkah'], ['Checklist', '- [x] selesai\n- [ ] belum'],
      ['Kutipan + nama', '> Kalimat kutipan\n> — Nama'], ['Kutipan besar', '> [!QUOTE]\n> Kalimat\n> — Nama'],
      ['Kotak info (ganti TIP: INFO, NOTE, SUCCESS, WARNING, DANGER)', '> [!TIP]\n> Isi'],
      ['Spoiler / FAQ', ':::spoiler Judul\nIsi tersembunyi\n:::'], ['Kelebihan & kekurangan', ':::banding\n:::kelebihan\n- poin\n:::\n:::kekurangan\n- poin\n:::\n:::'],
      ['Langkah-langkah', ':::langkah\n1. Langkah\n2. Langkah\n:::'], ['Galeri foto', ':::galeri\n![a](url)\n![b](url)\n:::'],
      ['Kotak bebas', ':::kotak Judul\nIsi\n:::'],
      ['Tombol', '[[tombol:Teks|/link]] [[tombol-garis:Teks|/link]]'], ['Tabel', '| A | B |\n| --- | :---: |\n| 1 | 2 |'],
      ['Blok kode', '```js nama-file.js\nkode\n```'], ['Garis', '---'], ['Gambar', '![alt](url "keterangan")'],
      ['Kartu produk', '[[produk:ID]]'], ['Video YouTube', '[[youtube:ID]]'],
    ],
  },
];

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function safeUrl(raw: string): string | null {
  const url = raw.trim().replace(/&amp;/g, '&');
  if (/^(https?:\/\/|\/(?!\/)|#|mailto:)/i.test(url)) return esc(url);
  return null;
}

const isExternal = (u: string) => /^https?:\/\//i.test(u) && !/^https?:\/\/(www\.)?urbanix\.id/i.test(u);

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&[a-z#0-9]+;/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'bagian'
  );
}

function stars(value: number) {
  const v = Math.max(0, Math.min(5, value));
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  let s = '';
  for (let k = 0; k < 5; k++) s += `<span class="${k < full ? 'on' : k === full && half ? 'half' : ''}">★</span>`;
  return `<span class="rating" role="img" aria-label="Rating ${v} dari 5">${s}<b>${v.toLocaleString('id-ID')}</b></span>`;
}

/** Format dalam baris. Input mentah (belum di-escape). */
export function inline(raw: string): string {
  const keep: string[] = [];
  const hold = (html: string) => {
    keep.push(html);
    return `\u0000${keep.length - 1}\u0000`;
  };
  let s = raw.replace(/`([^`]+)`/g, (_, c) => hold(`<code>${esc(c)}</code>`));
  s = s.replace(/\[\[label:([^\]|]{1,30})\]\]/g, (_, t) => hold(`<span class="md-badge">${esc(t)}</span>`));
  s = s.replace(/\[\[rating:(\d(?:[.,]\d)?)\]\]/g, (_, v) => hold(stars(Number(v.replace(',', '.')))));
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, alt, url) => {
    const u = safeUrl(url);
    return u ? `<img src="${u}" alt="${alt}" loading="lazy" />` : alt;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
    const u = safeUrl(url);
    if (!u) return text;
    return isExternal(u)
      ? `<a href="${u}" target="_blank" rel="noopener noreferrer nofollow">${text}<span class="ext" aria-hidden="true">↗</span></a>`
      : `<a href="${u}">${text}</a>`;
  });
  s = s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/==([^=]+)==/g, '<mark>$1</mark>')
    .replace(/\|\|([^|]+)\|\|/g, '<span class="spoiler" tabindex="0" title="Klik untuk melihat">$1</span>')
    .replace(/\+\+([^+\s][^+]*(?:\+[^+\s][^+]*)*?)\+\+/g, (_, k: string) =>
      k.split('+').map((x) => `<kbd>${x.trim()}</kbd>`).join('<span class="kbd-plus">+</span>')
    );
  return s.replace(/\u0000(\d+)\u0000/g, (_, n) => keep[Number(n)]);
}

const KEYWORDS =
  'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|import|from|export|default|class|new|await|async|try|catch|throw|true|false|null|undefined|def|elif|in|not|and|or|print|echo|cd|sudo|git|npm|docker|SELECT|FROM|WHERE|INSERT|UPDATE';

/** Pewarnaan sintaks sederhana: komentar, string, angka, kata kunci, fungsi, tag/properti. */
function highlight(code: string, lang: string): string {
  const hashComment = /^(bash|sh|shell|zsh|python|py|yaml|yml|toml|ini|dockerfile|env)$/i.test(lang);
  const comment = hashComment ? '#[^\\n]*' : /^(html|xml)$/i.test(lang) ? '<!--[\\s\\S]*?-->' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
  const re = new RegExp(
    `(${comment})|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|\\b(\\d+(?:\\.\\d+)?)\\b|\\b(${KEYWORDS})\\b|\\b([A-Za-z_]\\w*)(?=\\()|(<\\/?[A-Za-z][\\w-]*|^\\s*[A-Za-z-]+(?=\\s*:\\s))`,
    'gm'
  );
  let out = '';
  let last = 0;
  for (const m of code.matchAll(re)) {
    out += esc(code.slice(last, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : m[4] ? 'k' : m[5] ? 'f' : 't';
    out += `<span class="tok-${cls}">${esc(m[0])}</span>`;
    last = (m.index ?? 0) + m[0].length;
  }
  return out + esc(code.slice(last));
}

const CALLOUTS: Record<string, { cls: string; title: string; icon: string }> = {
  TIP: { cls: 'tip', title: 'Tips', icon: '💡' },
  INFO: { cls: 'info', title: 'Info', icon: 'ℹ️' },
  NOTE: { cls: 'note', title: 'Catatan', icon: '📝' },
  SUCCESS: { cls: 'success', title: 'Berhasil', icon: '✅' },
  WARNING: { cls: 'warning', title: 'Perhatian', icon: '⚠️' },
  DANGER: { cls: 'danger', title: 'Penting', icon: '⛔' },
};

function splitRow(line: string) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
type ListItem = { indent: number; ordered: boolean; text: string };

function renderList(items: ListItem[]): string {
  const tag = items[0].ordered ? 'ol' : 'ul';
  const base = items[0].indent;
  let html = '';
  let k = 0;
  while (k < items.length) {
    const it = items[k];
    const task = it.text.match(/^\[([ xX])\]\s+(.*)$/);
    const children: ListItem[] = [];
    let j = k + 1;
    while (j < items.length && items[j].indent > base) children.push(items[j++]);
    const done = Boolean(task && task[1].trim());
    const body = task ? `<span class="check" aria-hidden="true"></span><span>${inline(task[2])}</span>` : inline(it.text);
    html += `<li${task ? ` class="task${done ? ' done' : ''}"` : ''}>${body}${children.length ? renderList(children) : ''}</li>`;
    k = j;
  }
  const hasTask = items.some((x) => /^\[[ xX]\]\s/.test(x.text));
  return `<${tag}${hasTask ? ' class="task-list"' : ''}>${html}</${tag}>`;
}

/** Isi wadah :::nama ... ::: (mendukung wadah bersarang). */
function readContainer(lines: string[], start: number): { inner: string[]; next: number } {
  let depth = 1;
  const inner: string[] = [];
  let k = start;
  while (k < lines.length) {
    const t = lines[k].trim();
    if (/^:::\s*[\w-]+/.test(t)) depth++;
    else if (t === ':::' && --depth === 0) return { inner, next: k + 1 };
    inner.push(lines[k]);
    k++;
  }
  return { inner, next: k };
}

const htmlOf = (md: string) =>
  renderMarkdown(md)
    .blocks.map((b) => (b.type === 'html' ? b.html : ''))
    .join('');

const IMG_LINE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;

export function renderMarkdown(source: string): { blocks: Block[]; headings: Heading[] } {
  const lines = (source || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  const headings: Heading[] = [];
  const usedIds = new Set<string>();
  let html = '';
  const flush = () => {
    if (html) blocks.push({ type: 'html', html });
    html = '';
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // kartu produk / video
    const embed = trimmed.match(/^\[\[(produk|youtube):([A-Za-z0-9_-]+)\]\]$/);
    if (embed) {
      flush();
      blocks.push(embed[1] === 'produk' ? { type: 'product', id: embed[2] } : { type: 'youtube', id: embed[2] });
      i++;
      continue;
    }

    // tombol: [[tombol:Teks|/link]] (boleh beberapa dalam satu baris)
    if (/^(\[\[tombol(-garis)?:[^\]]+\]\]\s*)+$/.test(trimmed)) {
      const btns = [...trimmed.matchAll(/\[\[tombol(-garis)?:([^|\]]+)\|([^\]]+)\]\]/g)]
        .map((m) => {
          const u = safeUrl(m[3]);
          if (!u) return '';
          const ext = isExternal(u) ? ' target="_blank" rel="noopener noreferrer"' : '';
          return `<a class="md-btn${m[1] ? ' outline' : ''}" href="${u}"${ext}>${esc(m[2].trim())}<span aria-hidden="true">→</span></a>`;
        })
        .join('');
      html += `<p class="md-btns">${btns}</p>`;
      i++;
      continue;
    }

    // wadah :::nama Judul ... :::
    const box = trimmed.match(/^:::\s*([\w-]+)\s*(.*)$/);
    if (box) {
      const kind = box[1].toLowerCase();
      const title = box[2].trim();
      const { inner, next } = readContainer(lines, i + 1);
      i = next;
      if (kind === 'galeri') {
        const imgs = inner
          .map((l) => l.trim().match(IMG_LINE))
          .map((m) => {
            const u = m && safeUrl(m[2]);
            return m && u ? `<figure><img src="${u}" alt="${esc(m[1])}" loading="lazy" />${m[3] ? `<figcaption>${esc(m[3])}</figcaption>` : ''}</figure>` : '';
          })
          .join('');
        html += `<div class="gallery">${imgs}</div>`;
        continue;
      }
      const content = htmlOf(inner.join('\n'));
      if (kind === 'spoiler' || kind === 'detail' || kind === 'faq') {
        const label = title || (kind === 'spoiler' ? 'Spoiler: klik untuk membuka' : 'Lihat detail');
        html += `<details class="md-details${kind === 'spoiler' ? ' is-spoiler' : ''}"><summary>${inline(label)}</summary><div class="md-details-body">${content}</div></details>`;
      } else if (kind === 'kelebihan' || kind === 'kekurangan') {
        const plus = kind === 'kelebihan';
        html += `<div class="procon ${plus ? 'pro' : 'con'}"><p class="procon-title"><span aria-hidden="true">${plus ? '👍' : '👎'}</span> ${esc(
          title || (plus ? 'Kelebihan' : 'Kekurangan')
        )}</p>${content}</div>`;
      } else if (kind === 'banding') {
        html += `<div class="procon-grid">${content}</div>`;
      } else if (kind === 'langkah') {
        html += `<div class="steps">${title ? `<p class="steps-title">${inline(title)}</p>` : ''}${content}</div>`;
      } else {
        html += `<div class="md-box">${title ? `<p class="md-box-title">${inline(title)}</p>` : ''}${content}</div>`;
      }
      continue;
    }

    // blok kode: ```bahasa nama-file
    const fence = trimmed.match(/^```\s*([\w+-]*)\s*(.*)$/);
    if (fence) {
      const lang = fence[1] || '';
      const file = fence[2].trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++;
      html += `<figure class="code-block"><figcaption><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="file">${esc(
        file || lang || 'kode'
      )}</span>${lang && file ? `<span class="lang">${esc(lang)}</span>` : ''}</figcaption><pre><code>${highlight(body.join('\n'), lang)}</code></pre></figure>`;
      continue;
    }

    // judul: # besar, ## bagian, ### sub, #### kecil
    const h = trimmed.match(/^(#{1,4})\s+(.+?)\s*#*$/);
    if (h) {
      const depth = h[1].length;
      const tag = depth === 1 ? 'h2' : `h${depth}`;
      const text = inline(h[2]);
      const plain = text
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
      let id = slugify(plain);
      for (let n = 2; usedIds.has(id); n++) id = `${slugify(plain)}-${n}`;
      usedIds.add(id);
      if (depth <= 3) headings.push({ id, text: plain, level: depth === 3 ? 3 : 2 });
      html += `<${tag} id="${id}"${depth === 1 ? ' class="h-display"' : ''}>${text}</${tag}>`;
      i++;
      continue;
    }

    // garis
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      html += '<hr />';
      i++;
      continue;
    }

    // gambar sendirian = figure dengan keterangan
    const fig = trimmed.match(IMG_LINE);
    if (fig) {
      const u = safeUrl(fig[2]);
      if (u) {
        html += `<figure class="image"><img src="${u}" alt="${esc(fig[1])}" loading="lazy" />${
          fig[3] ? `<figcaption>${inline(fig[3])}</figcaption>` : ''
        }</figure>`;
      }
      i++;
      continue;
    }

    // kutipan / kotak info / kutipan besar
    if (/^>/.test(trimmed)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ''));
      const kind = body[0]?.trim().match(/^\[!(\w+)\]\s*(.*)$/);
      const key = kind?.[1].toUpperCase();
      const rest = kind ? body.slice(1) : body;
      let cite = '';
      const lastLine = rest[rest.length - 1]?.trim() || '';
      if (/^(—|--|–)\s*\S/.test(lastLine)) {
        cite = lastLine.replace(/^(—|--|–)\s*/, '');
        rest.pop();
      }
      const content = rest
        .join('\n')
        .split(/\n\s*\n/)
        .filter((p) => p.trim())
        .map((p) => `<p>${p.split('\n').map(inline).join('<br />')}</p>`)
        .join('');
      const citeHtml = cite ? `<cite>${inline(cite)}</cite>` : '';
      if (key === 'QUOTE') {
        html += `<figure class="pull-quote"><blockquote>${content}</blockquote>${citeHtml ? `<figcaption>${citeHtml}</figcaption>` : ''}</figure>`;
      } else if (key && CALLOUTS[key]) {
        const c = CALLOUTS[key];
        const title = kind?.[2] ? inline(kind[2]) : c.title;
        html += `<aside class="callout callout-${c.cls}"><p class="callout-title"><span aria-hidden="true">${c.icon}</span> ${title}</p>${content}</aside>`;
      } else {
        html += `<blockquote>${content}${citeHtml}</blockquote>`;
      }
      continue;
    }

    // tabel (rata kiri/tengah/kanan dari baris pemisah)
    if (/^\|.*\|$/.test(trimmed) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1].trim())) {
      const head = splitRow(trimmed);
      const align = splitRow(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : ''));
      const style = (k: number) => (align[k] ? ` style="text-align:${align[k]}"` : '');
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) rows.push(splitRow(lines[i++]));
      html += `<div class="table-wrap"><table><thead><tr>${head.map((c, k) => `<th${style(k)}>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows
        .map((r) => `<tr>${r.map((c, k) => `<td${style(k)}>${inline(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody></table></div>`;
      continue;
    }

    // daftar (termasuk checklist & daftar bersarang)
    if (LIST_ITEM.test(line)) {
      const items: ListItem[] = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST_ITEM);
        if (m) {
          items.push({ indent: m[1].replace(/\t/g, '    ').length, ordered: /\d/.test(m[2]), text: m[3] });
          i++;
        } else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          items[items.length - 1].text += ' ' + lines[i++].trim();
        } else break;
      }
      html += renderList(items);
      continue;
    }

    // paragraf
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|```|>|:::|\[\[(produk|youtube|tombol)|([-*+]|\d+[.)])\s|(-{3,}|\*{3,})$|\|.*\|$)/.test(lines[i].trim())
    ) {
      para.push(lines[i++].trim());
    }
    if (para.length) html += `<p>${para.map(inline).join('<br />')}</p>`;
    else i++;
  }
  flush();
  return { blocks, headings };
}
