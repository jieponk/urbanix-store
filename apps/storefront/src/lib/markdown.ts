/**
 * Renderer Markdown kecil & aman untuk Artikel Urbanix (tanpa library luar).
 * Semua teks di-escape dulu, jadi HTML yang diketik penulis tidak ikut dijalankan.
 *
 * Didukung: ## / ### / #### judul, **tebal**, *miring*, ~~coret~~, ==sorot==, `kode`,
 * [link](url), ![gambar](url "keterangan"), daftar - / 1., > kutipan,
 * > [!TIP] / [!INFO] / [!WARNING] kotak info, ``` blok kode ```, tabel | a | b |, --- garis,
 * [[produk:ID]] kartu produk, [[youtube:ID]] video.
 */

export type Block =
  | { type: 'html'; html: string }
  | { type: 'product'; id: string }
  | { type: 'youtube'; id: string };

export type Heading = { id: string; text: string; level: 2 | 3 };

export const DEFAULT_COVER = '/inspirasi/default-cover.webp';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function safeUrl(raw: string): string | null {
  const url = raw.trim().replace(/&amp;/g, '&');
  if (/^(https?:\/\/|\/(?!\/)|#|mailto:)/i.test(url)) return esc(url);
  return null;
}

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

/** Format dalam baris. Input mentah (belum di-escape). */
export function inline(raw: string): string {
  const codes: string[] = [];
  let s = raw.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code>${esc(c)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = esc(s);
  // gambar di dalam baris
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, alt, url) => {
    const u = safeUrl(url);
    return u ? `<img src="${u}" alt="${alt}" loading="lazy" />` : alt;
  });
  // link
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
    const u = safeUrl(url);
    if (!u) return text;
    const external = /^https?:\/\//i.test(u) && !/^https?:\/\/(www\.)?urbanix\.id/i.test(u);
    return external
      ? `<a href="${u}" target="_blank" rel="noopener noreferrer nofollow">${text}</a>`
      : `<a href="${u}">${text}</a>`;
  });
  s = s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/==([^=]+)==/g, '<mark>$1</mark>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}

const KEYWORDS =
  'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|import|from|export|default|class|new|await|async|try|catch|throw|true|false|null|undefined|def|elif|in|not|and|or|print|echo|cd|sudo|git|npm|docker|SELECT|FROM|WHERE';

/** Pewarnaan sintaks sederhana (komentar, string, angka, kata kunci). */
function highlight(code: string, lang: string): string {
  const hashComment = /^(bash|sh|shell|zsh|python|py|yaml|yml|toml|ini|dockerfile|env)$/i.test(lang);
  const comment = hashComment ? '#[^\\n]*' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
  const re = new RegExp(
    `(${comment})|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|\\b(\\d+(?:\\.\\d+)?)\\b|\\b(${KEYWORDS})\\b`,
    'g'
  );
  let out = '';
  let last = 0;
  for (const m of code.matchAll(re)) {
    out += esc(code.slice(last, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : 'k';
    out += `<span class="tok-${cls}">${esc(m[0])}</span>`;
    last = (m.index ?? 0) + m[0].length;
  }
  return out + esc(code.slice(last));
}

const CALLOUTS: Record<string, { cls: string; title: string; icon: string }> = {
  TIP: { cls: 'tip', title: 'Tips', icon: '💡' },
  INFO: { cls: 'info', title: 'Info', icon: 'ℹ️' },
  NOTE: { cls: 'info', title: 'Catatan', icon: 'ℹ️' },
  WARNING: { cls: 'warning', title: 'Perhatian', icon: '⚠️' },
};

function splitRow(line: string) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

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

    // embed khusus
    const embed = trimmed.match(/^\[\[(produk|youtube):([A-Za-z0-9_-]+)\]\]$/);
    if (embed) {
      flush();
      blocks.push(embed[1] === 'produk' ? { type: 'product', id: embed[2] } : { type: 'youtube', id: embed[2] });
      i++;
      continue;
    }

    // blok kode
    const fence = trimmed.match(/^```\s*([\w+-]*)\s*$/);
    if (fence) {
      const lang = fence[1] || '';
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++;
      html += `<figure class="code-block">${lang ? `<figcaption>${esc(lang)}</figcaption>` : ''}<pre><code>${highlight(
        body.join('\n'),
        lang
      )}</code></pre></figure>`;
      continue;
    }

    // judul
    const h = trimmed.match(/^(#{1,4})\s+(.+?)\s*#*$/);
    if (h) {
      const level = Math.min(4, Math.max(2, h[1].length));
      const text = inline(h[2]);
      const plain = text.replace(/<[^>]+>/g, '');
      let id = slugify(plain);
      for (let n = 2; usedIds.has(id); n++) id = `${slugify(plain)}-${n}`;
      usedIds.add(id);
      if (level <= 3) headings.push({ id, text: plain, level: level as 2 | 3 });
      html += `<h${level} id="${id}">${text}</h${level}>`;
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
    const fig = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
    if (fig) {
      const u = safeUrl(fig[2]);
      if (u) {
        const caption = fig[3] || '';
        html += `<figure class="image"><img src="${u}" alt="${esc(fig[1])}" loading="lazy" />${
          caption ? `<figcaption>${inline(caption)}</figcaption>` : ''
        }</figure>`;
      }
      i++;
      continue;
    }

    // kutipan / kotak info
    if (/^>/.test(trimmed)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ''));
      const kind = body[0]?.trim().match(/^\[!(\w+)\]$/);
      const callout = kind && CALLOUTS[kind[1].toUpperCase()];
      const content = (callout ? body.slice(1) : body)
        .join('\n')
        .split(/\n\s*\n/)
        .map((p) => `<p>${p.split('\n').map(inline).join('<br />')}</p>`)
        .join('');
      html += callout
        ? `<aside class="callout callout-${callout.cls}"><p class="callout-title"><span aria-hidden="true">${callout.icon}</span> ${callout.title}</p>${content}</aside>`
        : `<blockquote>${content}</blockquote>`;
      continue;
    }

    // tabel
    if (/^\|.*\|$/.test(trimmed) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1].trim())) {
      const head = splitRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) rows.push(splitRow(lines[i++]));
      html += `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody></table></div>`;
      continue;
    }

    // daftar
    const list = trimmed.match(/^([-*+]|\d+[.)])\s+/);
    if (list) {
      const ordered = /\d/.test(list[1]);
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^([-*+]|\d+[.)])\s+(.*)$/);
        if (m && /\d/.test(m[1]) === ordered) {
          items.push(m[2]);
          i++;
        } else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          items[items.length - 1] += ' ' + lines[i++].trim();
        } else break;
      }
      const tag = ordered ? 'ol' : 'ul';
      html += `<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`;
      continue;
    }

    // paragraf
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|```|>|\[\[(produk|youtube):|([-*+]|\d+[.)])\s|(-{3,}|\*{3,})$|\|.*\|$)/.test(lines[i].trim())
    ) {
      para.push(lines[i++].trim());
    }
    if (para.length) html += `<p>${para.map(inline).join('<br />')}</p>`;
    else i++;
  }
  flush();
  return { blocks, headings };
}
