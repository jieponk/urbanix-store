"""Fungsi bantu yang dipakai bersama oleh seed_shopee dan importer."""


def gallery_from_item(item):
    """Gambar tambahan dari data Shopee: tanpa gambar utama, tanpa duplikat, maks. 8."""
    cover = item.get("cover_image") or ""
    seen, result = {cover}, []
    for url in item.get("images") or []:
        if url and url not in seen:
            seen.add(url)
            result.append(url)
    return result[:8]
