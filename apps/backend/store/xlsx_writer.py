"""Penulis .xlsx minimal tanpa library tambahan (zipfile + XML).

Cukup untuk laporan & template mass update: satu atau beberapa sheet, baris pertama tebal,
angka tetap angka (bisa dijumlah di Excel), teks sebagai inline string.
"""

from __future__ import annotations

import io
import zipfile
from decimal import Decimal
from xml.sax.saxutils import escape


def _col(n: int) -> str:
    name = ""
    n += 1
    while n:
        n, r = divmod(n - 1, 26)
        name = chr(65 + r) + name
    return name


def _cell(ref: str, value, header: bool) -> str:
    style = ' s="1"' if header else ""
    if value is None or value == "":
        return ""
    if isinstance(value, bool):
        value = "ya" if value else "tidak"
    if isinstance(value, (int, float, Decimal)) and not header:
        return f'<c r="{ref}"{style}><v>{value}</v></c>'
    text = escape(str(value)).replace("\n", "&#10;")
    return f'<c r="{ref}" t="inlineStr"{style}><is><t xml:space="preserve">{text}</t></is></c>'


def _sheet(rows: list[list], widths: list[int] | None) -> str:
    cols = ""
    if widths:
        cols = "<cols>" + "".join(
            f'<col min="{i + 1}" max="{i + 1}" width="{w}" customWidth="1"/>' for i, w in enumerate(widths)
        ) + "</cols>"
    body = []
    for r, row in enumerate(rows):
        cells = "".join(_cell(f"{_col(c)}{r + 1}", v, r == 0) for c, v in enumerate(row))
        body.append(f'<row r="{r + 1}">{cells}</row>')
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        f"{cols}<sheetData>{''.join(body)}</sheetData></worksheet>"
    )


def build_xlsx(sheets: dict[str, list[list]], widths: dict[str, list[int]] | None = None) -> bytes:
    """sheets = {"Nama sheet": [[header...], [baris...], ...]}"""
    widths = widths or {}
    names = list(sheets)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            + "".join(
                f'<Override PartName="/xl/worksheets/sheet{i + 1}.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                for i in range(len(names))
            )
            + "</Types>",
        )
        z.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            "</Relationships>",
        )
        z.writestr(
            "xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
            + "".join(
                f'<sheet name="{escape(n[:31])}" sheetId="{i + 1}" r:id="rId{i + 1}"/>' for i, n in enumerate(names)
            )
            + "</sheets></workbook>",
        )
        z.writestr(
            "xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + "".join(
                f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i + 1}.xml"/>'
                for i in range(len(names))
            )
            + f'<Relationship Id="rId{len(names) + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            "</Relationships>",
        )
        z.writestr(
            "xl/styles.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts>'
            '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
            '<fill><patternFill patternType="solid"><fgColor rgb="FFE8ECF7"/></patternFill></fill></fills>'
            '<borders count="1"><border/></borders>'
            '<cellStyleXfs count="1"><xf/></cellStyleXfs>'
            '<cellXfs count="2"><xf fontId="0"/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs>'
            "</styleSheet>",
        )
        for i, n in enumerate(names):
            z.writestr(f"xl/worksheets/sheet{i + 1}.xml", _sheet(sheets[n], widths.get(n)))
    return buf.getvalue()
