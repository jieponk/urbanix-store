"""Ongkir otomatis lewat RajaOngkir API V2 (Komerce).

- Cari tujuan: GET  {BASE}/destination/domestic-destination?search=...   (header `key`)
- Hitung ongkir: POST {BASE}/calculate/domestic-cost  (form: origin, destination, weight gram,
  courier "jne:jnt:sicepat", price "lowest")

Kunci API di env RAJAONGKIR_API_KEY (dipasang lewat deploy/set-rajaongkir.sh).
Asal pengiriman & daftar kurir diatur di Seller Center → Pengaturan.
Tarif selalu dihitung ulang di server saat pesanan dibuat (harga dari pembeli tidak dipercaya).
"""
import hashlib
import logging
from decimal import Decimal

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

BASE_URL = "https://rajaongkir.komerce.id/api/v1"
DEFAULT_COURIERS = "jne:jnt:sicepat:anteraja:pos"
COURIER_CHOICES = [
    ("jne", "JNE"),
    ("jnt", "J&T Express"),
    ("sicepat", "SiCepat"),
    ("anteraja", "AnterAja"),
    ("pos", "POS Indonesia"),
    ("tiki", "TIKI"),
    ("ninja", "Ninja Xpress"),
    ("lion", "Lion Parcel"),
    ("ide", "ID Express"),
    ("sap", "SAP Express"),
    ("wahana", "Wahana"),
]
COURIER_CODES = {code for code, _ in COURIER_CHOICES}
FALLBACK_ITEM_WEIGHT = 1000  # gram, untuk barang yang belum diisi beratnya
MAX_WEIGHT = 150_000


class OngkirError(Exception):
    """Pesan aman untuk pembeli."""


def api_key() -> str:
    return (getattr(settings, "RAJAONGKIR_API_KEY", "") or "").strip()


def is_configured(store=None) -> bool:
    if not api_key():
        return False
    if store is None:
        from .models import StoreSettings

        store = StoreSettings.load()
    return bool(store.rajaongkir_origin_id)


def courier_list(store) -> list[str]:
    raw = (store.rajaongkir_couriers or DEFAULT_COURIERS).replace(",", ":")
    codes = [c.strip().lower() for c in raw.split(":") if c.strip().lower() in COURIER_CODES]
    return codes or DEFAULT_COURIERS.split(":")


def _request(method: str, path: str, **kwargs) -> list:
    key = api_key()
    if not key:
        raise OngkirError("Cek ongkir otomatis belum aktif.")
    try:
        resp = requests.request(
            method, f"{BASE_URL}/{path}", headers={"key": key, "Accept": "application/json"}, timeout=12, **kwargs
        )
    except requests.RequestException:
        logger.exception("RajaOngkir tidak bisa dihubungi")
        raise OngkirError("Layanan cek ongkir sedang tidak bisa dihubungi. Coba lagi sebentar.")
    try:
        body = resp.json()
    except ValueError:
        body = {}
    meta = body.get("meta") or {}
    if resp.status_code == 404 or meta.get("code") == 404:
        return []
    if resp.status_code != 200 or meta.get("status") not in (None, "success"):
        logger.warning("RajaOngkir %s %s: HTTP %s %s", method, path, resp.status_code, str(meta)[:200])
        if resp.status_code in (401, 403):
            raise OngkirError("Kunci RajaOngkir ditolak. Hubungi admin toko.")
        if resp.status_code == 429:
            raise OngkirError("Kuota cek ongkir harian habis. Silakan pesan via WhatsApp dulu.")
        raise OngkirError("Ongkir untuk tujuan ini belum bisa dihitung.")
    data = body.get("data")
    return data if isinstance(data, list) else []


# ---------------------------------------------------------------- tujuan
def search_destination(query: str, limit: int = 15) -> list[dict]:
    query = " ".join((query or "").split())[:60]
    if len(query) < 3:
        return []
    ck = "ro:dest:" + hashlib.md5(query.lower().encode()).hexdigest()
    hit = cache.get(ck)
    if hit is not None:
        return hit
    rows = _request("GET", "destination/domestic-destination", params={"search": query, "limit": limit, "offset": 0})
    result = []
    for r in rows:
        zip_code = str(r.get("zip_code") or "").strip()
        try:
            result.append({
                "id": int(r["id"]),
                "label": str(r.get("label") or ""),
                "subdistrict": str(r.get("subdistrict_name") or ""),
                "district": str(r.get("district_name") or ""),
                "city": str(r.get("city_name") or ""),
                "province": str(r.get("province_name") or ""),
                "zip_code": zip_code[:5] if zip_code.isdigit() and len(zip_code) == 5 else "",
            })
        except (KeyError, TypeError, ValueError):
            continue
    cache.set(ck, result, 60 * 60 * 24)
    return result


# ---------------------------------------------------------------- tarif
def order_weight(lines) -> int:
    """Total berat kirim (gram). Barang tanpa berat dihitung FALLBACK_ITEM_WEIGHT."""
    total = 0
    for line in lines:
        total += (line.ship_weight or FALLBACK_ITEM_WEIGHT) * line.quantity
    return max(1, min(total, MAX_WEIGHT))


def rates(destination_id: int, weight: int, store=None) -> list[dict]:
    """Daftar layanan [{code, courier, courier_name, service, description, cost, etd}] urut termurah."""
    from .models import StoreSettings

    store = store or StoreSettings.load()
    if not is_configured(store):
        raise OngkirError("Cek ongkir otomatis belum aktif.")
    couriers = ":".join(courier_list(store))
    ck = f"ro:cost:{store.rajaongkir_origin_id}:{destination_id}:{weight}:{couriers}"
    hit = cache.get(ck)
    if hit is not None:
        return hit
    rows = _request(
        "POST",
        "calculate/domestic-cost",
        data={
            "origin": store.rajaongkir_origin_id,
            "destination": int(destination_id),
            "weight": int(weight),
            "courier": couriers,
            "price": "lowest",
        },
    )
    result, seen = [], set()
    for r in rows:
        try:
            cost = int(Decimal(str(r.get("cost") or 0)))
            courier = str(r.get("code") or "").lower()
            service = str(r.get("service") or "").strip()
        except Exception:
            continue
        if cost <= 0 or not courier or not service:
            continue
        code = f"{courier}:{service}"[:30]
        if code in seen:
            continue
        seen.add(code)
        etd = str(r.get("etd") or "").strip().lower().replace("day", "").replace("hari", "").strip(" -s")
        result.append({
            "code": code,
            "courier": courier,
            "courier_name": str(r.get("name") or courier.upper()),
            "service": service,
            "description": str(r.get("description") or ""),
            "cost": cost,
            "etd": etd,
        })
    result.sort(key=lambda x: x["cost"])
    cache.set(ck, result, 60 * 60 * 6)
    return result


def find_rate(destination_id: int, weight: int, code: str, store=None) -> dict | None:
    for rate in rates(destination_id, weight, store):
        if rate["code"] == code:
            return rate
    return None
