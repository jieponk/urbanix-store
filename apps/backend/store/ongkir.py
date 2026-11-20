"""Ongkir otomatis lewat Biteship.

- Cari tujuan:  GET  {BASE}/maps/areas?countries=ID&input=...&type=single
- Hitung ongkir: POST {BASE}/rates/couriers  {origin_area_id, destination_area_id, couriers "jne,jnt", items}
- Header: Authorization: <API key>  (biteship_live.… / biteship_test.…)

Kunci API di env BITESHIP_API_KEY (dipasang lewat deploy/set-biteship.sh).
Asal pengiriman & daftar kurir diatur di Seller Center → Pengaturan.
Tarif selalu dihitung ulang di server saat pesanan dibuat (harga dari pembeli tidak dipercaya).
Biaya Biteship per request: hasil disimpan sementara (cache) supaya pencarian berulang tidak ditagih lagi.
"""
import hashlib
import json
import logging
import re
from decimal import Decimal

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

BASE_URL = "https://api.biteship.com/v1"
DEFAULT_COURIERS = "jne:jnt:sicepat:anteraja:pos"
# Kurir reguler (tarif dari kecamatan/kode pos). Kurir instan (gojek/grab) butuh koordinat: belum dipakai.
COURIER_CHOICES = [
    ("jne", "JNE"),
    ("jnt", "J&T Express"),
    ("sicepat", "SiCepat"),
    ("anteraja", "AnterAja"),
    ("pos", "POS Indonesia"),
    ("tiki", "TIKI"),
    ("ninja", "Ninja Xpress"),
    ("lion", "Lion Parcel"),
    ("idexpress", "ID Express"),
    ("sap", "SAP Express"),
    ("wahana", "Wahana"),
    ("paxel", "Paxel"),
    ("rpx", "RPX"),
    # Kurir instan: tarif dari jarak, butuh titik gudang & titik penerima (peta)
    ("gojek", "GoSend (instan)"),
    ("grab", "GrabExpress (instan)"),
]
COURIER_CODES = {code for code, _ in COURIER_CHOICES}
INSTANT_COURIERS = {"gojek", "grab"}
FALLBACK_ITEM_WEIGHT = 1000  # gram, untuk barang yang belum diisi beratnya
MAX_WEIGHT = 150_000
AREA_ID_RE = re.compile(r"^[A-Za-z0-9]{4,60}$")


class OngkirError(Exception):
    """Pesan aman untuk pembeli. `detail` = pesan asli Biteship (untuk admin, bukan pembeli)."""

    def __init__(self, message, detail=""):
        super().__init__(message)
        self.detail = detail


def api_key() -> str:
    return (getattr(settings, "BITESHIP_API_KEY", "") or "").strip()


def is_configured(store=None) -> bool:
    if not api_key():
        return False
    if store is None:
        from .models import StoreSettings

        store = StoreSettings.load()
    return bool(store.ongkir_origin_id)


def _selected(store) -> list[str]:
    raw = (store.ongkir_couriers or DEFAULT_COURIERS).replace(",", ":")
    return [c.strip().lower() for c in raw.split(":") if c.strip().lower() in COURIER_CODES]


def courier_list(store) -> list[str]:
    """Kurir reguler (tarif dari area tujuan)."""
    codes = [c for c in _selected(store) if c not in INSTANT_COURIERS]
    return codes or DEFAULT_COURIERS.split(":")


def instant_list(store) -> list[str]:
    """Kurir instan yang aktif — hanya bila titik gudang sudah diisi."""
    if store.ongkir_origin_lat is None or store.ongkir_origin_lng is None:
        return []
    return [c for c in _selected(store) if c in INSTANT_COURIERS]


def valid_coord(lat, lng) -> bool:
    """Titik di wilayah Indonesia (kotak kasar)."""
    try:
        lat, lng = float(lat), float(lng)
    except (TypeError, ValueError):
        return False
    return -11.5 <= lat <= 6.5 and 94.5 <= lng <= 141.5


def _request(method: str, path: str, **kwargs) -> dict:
    key = api_key()
    if not key:
        raise OngkirError("Cek ongkir otomatis belum aktif.")
    try:
        resp = requests.request(
            method,
            f"{BASE_URL}/{path}",
            headers={"Authorization": key, "Accept": "application/json"},
            timeout=12,
            **kwargs,
        )
    except requests.RequestException:
        logger.exception("Biteship tidak bisa dihubungi")
        raise OngkirError("Layanan cek ongkir sedang tidak bisa dihubungi. Coba lagi sebentar.")
    try:
        body = resp.json()
    except ValueError:
        body = {}
    if resp.status_code == 200 and body.get("success", True):
        return body
    logger.warning("Biteship %s %s: HTTP %s %s", method, path, resp.status_code, str(body)[:300])
    detail = str(body.get("error") or body.get("message") or "")[:300]
    code = body.get("code")
    if code:
        detail = f"{detail} (kode {code})".strip()
    if resp.status_code in (401, 403):
        raise OngkirError("Kunci Biteship ditolak. Hubungi admin toko.", detail)
    if resp.status_code == 402 or "balance" in str(body.get("error", "")).lower():
        raise OngkirError("Cek ongkir otomatis sedang tidak tersedia. Silakan pesan via WhatsApp dulu.", detail)
    if resp.status_code == 429:
        raise OngkirError("Layanan cek ongkir sedang sibuk. Coba lagi beberapa detik lagi.", detail)
    raise OngkirError("Ongkir untuk tujuan ini belum bisa dihitung.", detail)


# ---------------------------------------------------------------- tujuan
def search_destination(query: str, limit: int = 15) -> list[dict]:
    query = " ".join((query or "").split())[:60]
    if len(query) < 3:
        return []
    ck = "bs:area:" + hashlib.md5(query.lower().encode()).hexdigest()
    hit = cache.get(ck)
    if hit is not None:
        return hit
    body = _request("GET", "maps/areas", params={"countries": "ID", "input": query, "type": "single"})
    result = []
    for a in body.get("areas") or []:
        area_id = str(a.get("id") or "")
        if not AREA_ID_RE.match(area_id):
            continue
        zip_code = str(a.get("postal_code") or "").strip()
        result.append({
            "id": area_id,
            "label": str(a.get("name") or ""),
            "subdistrict": "",
            "district": str(a.get("administrative_division_level_3_name") or ""),
            "city": str(a.get("administrative_division_level_2_name") or ""),
            "province": str(a.get("administrative_division_level_1_name") or ""),
            "zip_code": zip_code if zip_code.isdigit() and len(zip_code) == 5 else "",
        })
        if len(result) >= limit:
            break
    cache.set(ck, result, 60 * 60 * 24 * 7)
    return result


# ---------------------------------------------------------------- tarif
def package_items(lines) -> list[dict]:
    """Barang untuk Biteship: berat kirim per barang (gram) & nilai barang (Rp)."""
    items = []
    for line in lines:
        items.append({
            "name": line.display_name[:100],
            "value": int(line.unit_price),
            "weight": int(line.ship_weight or FALLBACK_ITEM_WEIGHT),
            "quantity": int(line.quantity),
        })
    return items


def order_weight(lines) -> int:
    """Total berat kirim (gram). Barang tanpa berat dihitung FALLBACK_ITEM_WEIGHT."""
    total = sum((line.ship_weight or FALLBACK_ITEM_WEIGHT) * line.quantity for line in lines)
    return max(1, min(total, MAX_WEIGHT))


def _etd(r: dict) -> str:
    rng = str(r.get("shipment_duration_range") or "").replace(" ", "")
    unit = str(r.get("shipment_duration_unit") or "days").lower()
    if not rng:
        return ""
    if unit.startswith("hour"):
        return f"{rng} jam"
    return rng  # hari


def _parse_pricing(body: dict, instant=False) -> list[dict]:
    result, seen = [], set()
    for r in body.get("pricing") or []:
        try:
            cost = int(Decimal(str(r.get("price") or 0)))
        except Exception:
            continue
        courier = str(r.get("courier_code") or "").lower()
        service = str(r.get("courier_service_code") or "").strip().lower()
        if cost <= 0 or not courier or not service:
            continue
        code = f"{courier}:{service}"[:30]
        if code in seen:
            continue
        seen.add(code)
        result.append({
            "code": code,
            "courier": courier,
            "courier_name": str(r.get("courier_name") or courier.upper()),
            "service": str(r.get("courier_service_name") or service.upper()),
            "description": str(r.get("description") or ""),
            "cost": cost,
            "etd": _etd(r),
            "instant": instant or courier in INSTANT_COURIERS,
        })
    return result


def instant_rates(lat: float, lng: float, lines, store) -> list[dict]:
    """Tarif kurir instan (GoSend/Grab) dari titik gudang ke titik penerima."""
    couriers = instant_list(store)
    if not couriers or not valid_coord(lat, lng):
        return []
    lat, lng = round(float(lat), 6), round(float(lng), 6)
    items = package_items(lines)
    sig = hashlib.md5(json.dumps([store.ongkir_origin_lat, store.ongkir_origin_lng, lat, lng, couriers, items],
                                 sort_keys=True).encode()).hexdigest()
    ck = f"bs:instant:{sig}"
    hit = cache.get(ck)
    if hit is not None:
        return hit
    body = _request("POST", "rates/couriers", json={
        "origin_latitude": store.ongkir_origin_lat,
        "origin_longitude": store.ongkir_origin_lng,
        "destination_latitude": lat,
        "destination_longitude": lng,
        "couriers": ",".join(couriers),
        "items": items,
    })
    result = sorted(_parse_pricing(body, instant=True), key=lambda x: x["cost"])
    cache.set(ck, result, 60 * 15)  # tarif instan cepat berubah
    return result


def rates(destination_id: str, lines, store=None, lat=None, lng=None) -> list[dict]:
    """Daftar layanan [{code, courier, courier_name, service, description, cost, etd, instant}] urut termurah.
    Bila titik penerima (lat/lng) dikirim, tarif kurir instan ikut dihitung."""
    from .models import StoreSettings

    store = store or StoreSettings.load()
    if not is_configured(store):
        raise OngkirError("Cek ongkir otomatis belum aktif.")
    if not AREA_ID_RE.match(str(destination_id or "")):
        raise OngkirError("Alamat tujuan tidak valid. Pilih ulang kecamatannya.")
    couriers = ",".join(courier_list(store))
    items = package_items(lines)
    sig = hashlib.md5(json.dumps([store.ongkir_origin_id, destination_id, couriers, items], sort_keys=True).encode()).hexdigest()
    ck = f"bs:rate:{sig}"
    hit = cache.get(ck)
    if hit is not None:
        return _with_instant(hit, lat, lng, lines, store)
    body = _request(
        "POST",
        "rates/couriers",
        json={
            "origin_area_id": store.ongkir_origin_id,
            "destination_area_id": str(destination_id),
            "couriers": couriers,
            "items": items,
        },
    )
    result = sorted(_parse_pricing(body), key=lambda x: x["cost"])
    cache.set(ck, result, 60 * 60 * 3)
    return _with_instant(result, lat, lng, lines, store)


def _with_instant(result, lat, lng, lines, store):
    if lat is None or lng is None:
        return result
    try:
        extra = instant_rates(lat, lng, lines, store)
    except OngkirError:
        extra = []  # kurir reguler tetap tampil walau tarif instan gagal
    return sorted(result + extra, key=lambda x: x["cost"])


def find_rate(destination_id: str, lines, code: str, store=None, lat=None, lng=None) -> dict | None:
    for rate in rates(destination_id, lines, store, lat, lng):
        if rate["code"] == code:
            return rate
    return None


# ---------------------------------------------------------------- titik peta
def geocode(query: str) -> dict | None:
    """Perkiraan titik tengah kecamatan/kota untuk memusatkan peta (OpenStreetMap Nominatim, gratis).
    Hanya untuk posisi awal peta; titik akhir tetap dipilih pembeli. Disimpan 30 hari."""
    query = " ".join((query or "").split())[:120]
    if len(query) < 3:
        return None
    ck = "geo:" + hashlib.md5(query.lower().encode()).hexdigest()
    hit = cache.get(ck)
    if hit is not None:
        return hit or None
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "countrycodes": "id", "format": "jsonv2", "limit": 1},
            headers={"User-Agent": "UrbanixStore/1.0 (https://urbanix.id)", "Accept-Language": "id"},
            timeout=8,
        )
        rows = resp.json() if resp.status_code == 200 else []
    except (requests.RequestException, ValueError):
        return None
    result = {}
    if rows:
        try:
            result = {"lat": float(rows[0]["lat"]), "lng": float(rows[0]["lon"])}
        except (KeyError, TypeError, ValueError):
            result = {}
    cache.set(ck, result, 60 * 60 * 24 * 30)
    return result or None
