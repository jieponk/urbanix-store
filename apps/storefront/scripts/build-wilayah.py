"""Bangun data wilayah Indonesia untuk saran alamat di checkout (public/wilayah/*.json).

Sumber (lisensi MIT, data Kepmendagri 2025):
  https://github.com/cahyadsn/wilayah          → db/wilayah.sql
  https://github.com/cahyadsn/wilayah_kodepos  → db/wilayah_kodepos.sql

Pemakaian:
  git clone --depth 1 https://github.com/cahyadsn/wilayah /tmp/wilayah
  git clone --depth 1 https://github.com/cahyadsn/wilayah_kodepos /tmp/wilayah_kodepos
  python3 scripts/build-wilayah.py /tmp/wilayah/db/wilayah.sql /tmp/wilayah_kodepos/db/wilayah_kodepos.sql

Hasil:
  public/wilayah/provinsi.json      [[kode, nama], ...]
  public/wilayah/<kode-prov>.json   [[kab, [[kec, [[desa, kodepos], ...]], ...]], ...]
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROW = re.compile(r"\('([0-9.]+)',\s*'((?:[^'\\]|\\.|'')*)'\)")


def rows(path: str):
    text = Path(path).read_text(encoding="utf-8-sig")
    for kode, value in ROW.findall(text):
        yield kode, value.replace("''", "'").replace("\\'", "'").strip()


def tidy(name: str) -> str:
    name = re.sub(r"\s+", " ", name).strip()
    # Data sumber kadang HURUF BESAR semua → ubah ke huruf judul.
    if name.isupper() and len(name) > 3:
        name = name.title()
    return name


def main(wilayah_sql: str, kodepos_sql: str, out_dir: str = "public/wilayah"):
    names: dict[str, str] = {}
    for kode, nama in rows(wilayah_sql):
        names[kode] = tidy(nama)
    postal = dict(rows(kodepos_sql))

    children: dict[str, list[str]] = defaultdict(list)
    for kode in names:
        if "." in kode:
            children[kode.rsplit(".", 1)[0]].append(kode)
    by_name = lambda codes: sorted(codes, key=lambda c: names[c].lower())

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    provinces = sorted((k for k in names if "." not in k), key=lambda c: names[c])
    (out / "provinsi.json").write_text(
        json.dumps([[k, names[k]] for k in provinces], ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    total = 0
    for prov in provinces:
        data = []
        for kab in by_name(children[prov]):
            kecs = []
            for kec in by_name(children[kab]):
                desa = [[names[d], postal.get(d, "")] for d in by_name(children[kec])]
                total += len(desa)
                kecs.append([names[kec], desa])
            data.append([names[kab], kecs])
        (out / f"{prov}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(provinces)} provinsi, {total} desa/kelurahan → {out}")


if __name__ == "__main__":
    main(*sys.argv[1:])
