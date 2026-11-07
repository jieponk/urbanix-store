"""
Pembaca .xlsx minimal tanpa library tambahan (hanya zipfile + XML).

Dipakai untuk file ekspor Shopee Seller Centre, yang kadang tidak bisa dibuka
openpyxl karena atribut tampilan sheet yang tidak standar.
"""
import re
import zipfile
import xml.etree.ElementTree as ET

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def _col_index(ref: str) -> int:
    letters = re.match(r"[A-Z]+", ref).group(0)
    index = 0
    for ch in letters:
        index = index * 26 + (ord(ch) - 64)
    return index - 1


def _text(el) -> str:
    return "".join(t.text or "" for t in el.iter(f"{{{NS['m']}}}t"))


def read_sheets(path) -> dict[str, list[list[str]]]:
    """Kembalikan {nama_sheet: [[sel, ...], ...]} dengan semua nilai sebagai teks."""
    with zipfile.ZipFile(path) as zf:
        shared = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            shared = [_text(si) for si in root.findall("m:si", NS)]

        workbook = ET.fromstring(zf.read("xl/workbook.xml"))
        rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        targets = {r.get("Id"): r.get("Target") for r in rels.findall("rel:Relationship", NS)}

        result = {}
        for sheet in workbook.find("m:sheets", NS):
            rid = sheet.get(f"{{{NS['r']}}}id")
            target = targets[rid].lstrip("/")
            if not target.startswith("xl/"):
                target = "xl/" + target
            root = ET.fromstring(zf.read(target))
            rows = []
            for row in root.iter(f"{{{NS['m']}}}row"):
                values: dict[int, str] = {}
                for cell in row.findall("m:c", NS):
                    ref, kind = cell.get("r"), cell.get("t")
                    if kind == "inlineStr":
                        value = _text(cell)
                    else:
                        v = cell.find("m:v", NS)
                        value = v.text if v is not None and v.text is not None else ""
                        if kind == "s" and value:
                            value = shared[int(value)]
                    values[_col_index(ref)] = value
                if values:
                    width = max(values) + 1
                    rows.append([values.get(i, "") for i in range(width)])
                else:
                    rows.append([])
            result[sheet.get("name")] = rows
        return result
