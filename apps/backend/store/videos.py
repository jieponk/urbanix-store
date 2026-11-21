"""Video belanja: kelola di Seller Center, tampil di beranda ("Lihat langsung")."""
from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .images import MAX_COVER, ImageError, to_webp
from .models import Product, ShopVideo
from .pricing import price_info
from .seller_api import bad, staff

VIDEO_EXT = (".mp4", ".webm", ".mov", ".m4v")
MAX_VIDEO = 60 * 1024 * 1024  # 60 MB: video pendek vertikal. Lebih besar → pakai link TikTok/IG/YouTube.
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp")
MAX_POSTER = 5 * 1024 * 1024
MAX_PRODUCTS = 3


def _product_card(p: Product) -> dict:
    info = price_info(p)
    return {"id": p.id, "name": p.name, "image": p.image_url or "", "price": str(info.final), "normal": str(info.normal)}


def _row(v: ShopVideo, public: bool = False) -> dict:
    src = v.source()
    data = {
        "id": v.id,
        "title": v.title,
        "kind": src["kind"],
        "src": src["src"],
        "poster": v.poster.url if v.poster else src["thumb"],
        "link": v.video_url,
        "products": [_product_card(p) for p in v.products.all() if (p.is_active or not public)],
    }
    if not public:
        data.update({"sort_order": v.sort_order, "is_active": v.is_active, "has_file": bool(v.video_file),
                     "file_name": v.video_file.name.split("/")[-1] if v.video_file else ""})
    return data


def _truthy(value) -> bool:
    return str(value).lower() in ("1", "true", "ya", "on")


def _apply(video: ShopVideo, request) -> str | None:
    """Isi video dari form multipart. Kembalikan pesan error (atau None)."""
    d = request.data
    if "title" in d:
        video.title = str(d["title"]).strip()[:120]
    if not video.title:
        return "Judul video wajib diisi."
    if "video_url" in d:
        url = str(d["video_url"] or "").strip()
        if url and not url.startswith("http"):
            return "Link video harus diawali https://"
        video.video_url = url
    if "sort_order" in d:
        try:
            video.sort_order = max(0, int(d["sort_order"] or 0))
        except ValueError:
            return "Urutan harus angka."
    if "is_active" in d:
        video.is_active = _truthy(d["is_active"])

    f = request.FILES.get("video_file")
    if f:
        if not f.name.lower().endswith(VIDEO_EXT):
            return "File video harus MP4, WebM, atau MOV."
        if f.size > MAX_VIDEO:
            return "File video maks. 60 MB. Untuk video lebih besar, unggah ke TikTok/IG/YouTube lalu tempel link-nya."
        if video.video_file:
            video.video_file.delete(save=False)
        video.video_file = f
    elif d.get("remove_file") and video.video_file:
        video.video_file.delete(save=False)
        video.video_file = None

    p = request.FILES.get("poster")
    if p:
        if not p.name.lower().endswith(IMAGE_EXT) or p.size > MAX_POSTER:
            return "Sampul harus JPG/PNG/WebP, maks. 5 MB."
        try:
            webp = to_webp(p, MAX_COVER)
        except ImageError as exc:
            return str(exc)
        if video.poster:
            video.poster.delete(save=False)
        video.poster.save(webp.name, webp, save=False)
    elif d.get("remove_poster") and video.poster:
        video.poster.delete(save=False)
        video.poster = None

    if not video.video_file and not video.video_url:
        return "Unggah file video atau tempel link TikTok/Instagram/YouTube."
    return None


def _set_products(video: ShopVideo, request) -> str | None:
    if "product_ids" not in request.data:
        return None
    raw = request.data.getlist("product_ids") if hasattr(request.data, "getlist") else request.data["product_ids"]
    ids = [int(x) for x in (raw if isinstance(raw, list) else str(raw).split(",")) if str(x).strip().isdigit()]
    if len(ids) > MAX_PRODUCTS:
        return f"Maksimal {MAX_PRODUCTS} produk per video."
    video.products.set(Product.objects.filter(id__in=ids))
    return None


@staff(["GET", "POST"])
def videos(request):
    if request.method == "POST":
        video = ShopVideo(title="")
        err = _apply(video, request)
        if err:
            return bad(err)
        video.save()
        err = _set_products(video, request)
        if err:
            return bad(err)
        return Response(_row(video), status=201)
    return Response([_row(v) for v in ShopVideo.objects.prefetch_related("products")])


@staff(["PATCH", "DELETE"])
def video_detail(request, pk):
    video = get_object_or_404(ShopVideo, pk=pk)
    if request.method == "DELETE":
        if video.video_file:
            video.video_file.delete(save=False)
        if video.poster:
            video.poster.delete(save=False)
        video.delete()
        return Response(status=204)
    err = _apply(video, request)
    if err:
        return bad(err)
    video.save()
    err = _set_products(video, request)
    if err:
        return bad(err)
    return Response(_row(video))


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def public_videos(request):
    qs = ShopVideo.objects.filter(is_active=True).prefetch_related("products")[:12]
    return Response([_row(v, public=True) for v in qs])
