"""Artikel Urbanix (menu "Inspirasi"): API publik + API Seller Center."""

from __future__ import annotations

import hashlib
import json
import re
import urllib.parse
import urllib.request
import uuid

from django.conf import settings
from django.core.cache import cache

from django.db.models import Count, F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from django.core.files.storage import default_storage

from .images import MAX_BODY, MAX_COVER, ImageError, to_webp
from .models import Article, ArticleCategory, ArticleComment, ArticleCommentReaction, Product
from .seller_api import _product_row, bad, paginate, staff

PRODUCT_TOKEN = re.compile(r"\[\[produk:(\d+)\]\]")
ALLOWED_IMAGE = (".jpg", ".jpeg", ".png", ".webp", ".gif")
MAX_IMAGE = 5 * 1024 * 1024


def _public(view):
    view = authentication_classes([])(view)
    return permission_classes([AllowAny])(view)


# --------------------------------------------------------------------------- helpers
def plain_text(markdown: str) -> str:
    text = re.sub(r"```.*?```", " ", markdown or "", flags=re.S)
    text = re.sub(r"\[\[[^\]]*\]\]", " ", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"^\s*>\s*\[!\w+\]\s*$", " ", text, flags=re.M)
    text = re.sub(r"[#>*_`~=|\-]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def excerpt_of(article: Article, length=180) -> str:
    if article.excerpt:
        return article.excerpt
    text = plain_text(article.body)
    return text if len(text) <= length else text[:length].rsplit(" ", 1)[0] + "…"


def reading_minutes(body: str) -> int:
    return max(1, round(len(plain_text(body).split()) / 200))


def unique_slug(title: str, exclude_pk=None) -> str:
    base = slugify(title)[:150] or "artikel"
    slug, i = base, 2
    while Article.objects.filter(slug=slug).exclude(pk=exclude_pk).exists():
        slug, i = f"{base}-{i}", i + 1
    return slug


def _cover(article: Article) -> str:
    return article.cover.url if article.cover else ""


def _category(c: ArticleCategory | None):
    return {"name": c.name, "slug": c.slug} if c else None


def tag_list(a: Article) -> list[str]:
    seen, out = set(), []
    for t in (a.tags or "").split(","):
        t = re.sub(r"\s+", " ", t).strip().lower()[:40]
        if t and t not in seen:
            seen.add(t)
            out.append(t)
    return out[:12]


def card(a: Article) -> dict:
    return {
        "id": a.id,
        "title": a.title,
        "slug": a.slug,
        "excerpt": excerpt_of(a),
        "cover": _cover(a),
        "category": _category(a.category),
        "author_name": a.author_name,
        "published_at": a.published_at,
        "reading_minutes": reading_minutes(a.body),
        "is_pinned": a.is_pinned,
        "tags": tag_list(a),
        "comment_count": getattr(a, "approved_comments", None),
    }


def published():
    return (
        Article.objects.filter(status="PUBLISHED", published_at__lte=timezone.now())
        .select_related("category")
        .annotate(approved_comments=Count("comments", filter=Q(comments__is_approved=True)))
    )


def _products(ids) -> dict:
    from .pricing import prefetch_running_promos
    from .serializers import ProductSerializer

    qs = Product.objects.filter(pk__in=list(ids), is_active=True).select_related("category").prefetch_related(
        "variations", prefetch_running_promos()
    )
    return {str(p["id"]): p for p in ProductSerializer(list(qs), many=True).data}


REACTIONS = ["❤️", "😂", "😍", "😮", "😢", "🔥", "👍"]
GIF_RE = re.compile(r"^https://media\d?\.giphy\.com/media/[\w./-]+$")
# Kata yang membuat komentar ditahan untuk dicek admin dulu (tidak ditolak).
HOLD_WORDS = re.compile(
    r"\b(anjing|anjg|bangsat|bajingan|kontol|memek|ngentot|goblok|tolol|babi|judi|slot\s*gacor|togel|gacor|"
    r"pinjol|bokep|porn|casino|viagra)\b",
    re.I,
)


def _visitor(raw) -> str:
    raw = str(raw or "").strip()
    if not re.fullmatch(r"[A-Za-z0-9-]{16,64}", raw):
        return ""
    return hashlib.sha256(f"urbanix:{raw}".encode()).hexdigest()[:40]


def _reaction_summary(c: ArticleComment, visitor: str) -> tuple[dict, str]:
    counts: dict[str, int] = {}
    mine = ""
    for r in c.reactions.all():
        counts[r.emoji] = counts.get(r.emoji, 0) + 1
        if visitor and r.visitor == visitor:
            mine = r.emoji
    ordered = {e: counts[e] for e in sorted(counts, key=lambda e: (-counts[e], REACTIONS.index(e) if e in REACTIONS else 99))}
    return ordered, mine


def _one(c: ArticleComment, visitor: str = "") -> dict:
    reactions, mine = _reaction_summary(c, visitor)
    return {
        "id": c.id,
        "name": c.name,
        "body": c.body,
        "gif_url": c.gif_url,
        "created_at": c.created_at,
        "is_staff_reply": c.is_staff_reply,
        "reactions": reactions,
        "my_reaction": mine,
    }


def _comment(c: ArticleComment, visitor: str = "") -> dict:
    return {
        **_one(c, visitor),
        "replies": [_one(r, visitor) for r in c.replies.all() if r.is_approved],
    }


def _comment_qs(article: Article):
    from django.db.models import Prefetch

    return article.comments.filter(is_approved=True, parent__isnull=True).prefetch_related(
        "reactions",
        Prefetch("replies", queryset=ArticleComment.objects.order_by("created_at").prefetch_related("reactions")),
    )


# --------------------------------------------------------------------------- publik
@api_view(["GET"])
@_public
def article_list(request):
    """?category=<slug>&page=<n>&limit=<n> — artikel terbit, yang disematkan lebih dulu."""
    qs = published()
    cat = request.query_params.get("category")
    if cat:
        qs = qs.filter(category__slug=cat)
    label = (request.query_params.get("label") or "").strip().lower()
    if label:
        qs = qs.filter(tags__icontains=label)
    try:
        limit = max(1, min(48, int(request.query_params.get("limit", 12))))
        page = max(1, int(request.query_params.get("page", 1)))
    except ValueError:
        limit, page = 12, 1
    total = qs.count()
    pages = max(1, -(-total // limit))
    page = min(page, pages)
    start = (page - 1) * limit
    return Response({"count": total, "page": page, "pages": pages,
                     "results": [card(a) for a in qs[start:start + limit]]})


@api_view(["GET"])
@_public
def article_categories(request):
    now = timezone.now()
    cats = ArticleCategory.objects.annotate(
        count=Count("articles", filter=Q(articles__status="PUBLISHED", articles__published_at__lte=now))
    )
    return Response([{"name": c.name, "slug": c.slug, "count": c.count} for c in cats])


@api_view(["GET"])
@_public
def article_detail(request, slug):
    article = get_object_or_404(published(), slug=slug)
    Article.objects.filter(pk=article.pk).update(views=F("views") + 1)

    embedded_ids = set(PRODUCT_TOKEN.findall(article.body))
    related_ids = set(article.related_products.values_list("id", flat=True))
    products = _products(embedded_ids | {str(i) for i in related_ids})

    comments = (
        _comment_qs(article) if article.allow_comments else []
    )
    more = published().exclude(pk=article.pk)
    same = list(more.filter(category=article.category)[:3]) if article.category_id else []
    if len(same) < 3:
        same += list(more.exclude(pk__in=[a.pk for a in same])[: 3 - len(same)])

    return Response({
        **card(article),
        "body": article.body,
        "updated_at": article.updated_at,
        "allow_comments": article.allow_comments,
        "products": {k: v for k, v in products.items() if k in embedded_ids},
        "related_products": [products[str(i)] for i in related_ids if str(i) in products],
        "comments": [_comment(c) for c in comments],
        "more": [card(a) for a in same],
    })


class CommentThrottle(SimpleRateThrottle):
    """Maks. 5 komentar/menit per IP (IP asli diteruskan proxy lewat X-Forwarded-For)."""

    scope = "article_comment"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class ReactionThrottle(CommentThrottle):
    scope = "comment_reaction"


class GifThrottle(CommentThrottle):
    scope = "gif_search"


@api_view(["GET", "POST"])
@_public
def article_comments(request, slug):
    """GET: komentar terbaru (tanpa cache, berisi reaksi). POST: kirim komentar/balasan."""
    if request.method == "POST":
        return _post_comment(request, slug)
    article = get_object_or_404(published(), slug=slug)
    visitor = _visitor(request.query_params.get("visitor"))
    comments = [_comment(c, visitor) for c in _comment_qs(article)] if article.allow_comments else []
    return Response({
        "comments": comments,
        "allow_comments": article.allow_comments,
        "gif_enabled": bool(settings.GIPHY_API_KEY),
        "reactions": REACTIONS,
    })


def _post_comment(request, slug):
    if not CommentThrottle().allow_request(request, None):
        return Response({"error": "Terlalu banyak komentar. Tunggu sebentar."}, status=429)
    article = get_object_or_404(published(), slug=slug)
    if not article.allow_comments:
        return bad("Komentar untuk artikel ini ditutup.")
    data = request.data
    if (data.get("website") or "").strip():  # jebakan bot: kolom tersembunyi harus kosong
        return Response({"message": "Terima kasih!", "held": True}, status=201)
    name = (data.get("name") or "").strip()[:60]
    body = (data.get("body") or "").strip()
    email = (data.get("email") or "").strip()[:254]
    gif = (data.get("gif_url") or "").strip()[:500]
    if len(name) < 2:
        return bad("Nama minimal 2 huruf.")
    if gif and not GIF_RE.match(gif):
        return bad("GIF tidak valid.")
    if not gif and len(body) < 1:
        return bad("Komentar masih kosong.")
    if len(body) > 1500:
        return bad("Komentar maksimal 1.500 karakter.")
    if email and not re.match(r"^\S+@\S+\.\S+$", email):
        return bad("Email tidak valid.")
    links = len(re.findall(r"https?://|www\.", body, flags=re.I))
    if links > 1:
        return bad("Komentar berisi terlalu banyak link.")

    parent = None
    if data.get("parent"):
        parent = ArticleComment.objects.filter(pk=data.get("parent"), article=article, is_approved=True).first()
        if not parent:
            return bad("Komentar yang dibalas tidak ditemukan.")
        parent = parent.parent or parent  # balasan selalu satu tingkat (seperti Instagram)

    held = bool(links or HOLD_WORDS.search(body) or HOLD_WORDS.search(name) or re.search(r"(.)\1{9,}", body))
    c = ArticleComment.objects.create(
        article=article, parent=parent, name=name, email=email, body=body, gif_url=gif, is_approved=not held
    )
    if held:
        return Response({"message": "Komentarmu sedang dicek admin dulu sebelum tampil.", "held": True}, status=201)
    return Response({"message": "Komentar terkirim.", "held": False, "comment": _comment(c)}, status=201)


# lama: tetap dipakai URL .../comments/ (POST)
article_comment = article_comments


@api_view(["POST"])
@_public
@throttle_classes([ReactionThrottle])
def comment_react(request, pk):
    """Beri/ganti/hapus reaksi. emoji kosong atau sama dengan sebelumnya = hapus."""
    c = get_object_or_404(ArticleComment, pk=pk, is_approved=True, article__status="PUBLISHED")
    visitor = _visitor(request.data.get("visitor"))
    if not visitor:
        return bad("Pengunjung tidak dikenali. Muat ulang halaman.")
    emoji = (request.data.get("emoji") or "").strip()
    if emoji and emoji not in REACTIONS:
        return bad("Reaksi tidak dikenal.")
    current = ArticleCommentReaction.objects.filter(comment=c, visitor=visitor).first()
    if not emoji or (current and current.emoji == emoji):
        if current:
            current.delete()
    elif current:
        current.emoji = emoji
        current.save(update_fields=["emoji"])
    else:
        ArticleCommentReaction.objects.create(comment=c, visitor=visitor, emoji=emoji)
    c = ArticleComment.objects.prefetch_related("reactions").get(pk=c.pk)
    reactions, mine = _reaction_summary(c, visitor)
    return Response({"reactions": reactions, "my_reaction": mine})


def _giphy(endpoint: str, params: dict) -> list:
    key = f"giphy:{endpoint}:{json.dumps(params, sort_keys=True)}"
    hit = cache.get(key)
    if hit is not None:
        return hit
    q = urllib.parse.urlencode({**params, "api_key": settings.GIPHY_API_KEY, "rating": "pg", "lang": "id"})
    req = urllib.request.Request(f"https://api.giphy.com/v1/gifs/{endpoint}?{q}", headers={"User-Agent": "UrbanixStore/1.0"})
    with urllib.request.urlopen(req, timeout=8) as r:
        data = json.loads(r.read())
    out = []
    for g in data.get("data", []):
        imgs = g.get("images", {})
        small = imgs.get("fixed_width") or {}
        prev = imgs.get("fixed_width_small") or small
        url = (small.get("url") or "").split("?")[0]
        if not GIF_RE.match(url):
            continue
        out.append({
            "id": g.get("id"),
            "title": g.get("title", ""),
            "url": url,
            "preview": (prev.get("webp") or prev.get("url") or url).split("?")[0],
            "width": int(small.get("width") or 200),
            "height": int(small.get("height") or 150),
        })
    cache.set(key, out, 60 * 30)  # hemat kuota GIPHY
    return out


@api_view(["GET"])
@_public
@throttle_classes([GifThrottle])
def gif_search(request):
    if not settings.GIPHY_API_KEY:
        return Response({"error": "GIF belum diaktifkan."}, status=503)
    q = (request.query_params.get("q") or "").strip()[:50]
    try:
        offset = max(0, min(200, int(request.query_params.get("offset", 0))))
    except ValueError:
        offset = 0
    try:
        if q:
            results = _giphy("search", {"q": q, "limit": 24, "offset": offset})
        else:
            results = _giphy("trending", {"limit": 24, "offset": offset})
    except Exception:  # noqa: BLE001
        return Response({"error": "GIF sedang tidak bisa dimuat. Coba lagi nanti."}, status=502)
    return Response({"results": results})


# --------------------------------------------------------------------------- Seller Center
def _seller_row(a: Article) -> dict:
    return {
        **card(a),
        "status": a.status,
        "views": a.views,
        "pending_comments": getattr(a, "pending_comments", 0),
        "updated_at": a.updated_at,
    }


def _bool(value) -> bool:
    return str(value).lower() in ("1", "true", "ya", "on")


def _save_article(request, article: Article | None):
    d = request.data
    article = article or Article()
    if "title" in d:
        title = (d.get("title") or "").strip()
        if not title:
            return None, "Judul wajib diisi."
        article.title = title[:160]
    if not article.title:
        return None, "Judul wajib diisi."
    if "slug" in d or not article.slug:
        raw = (d.get("slug") or "").strip()
        article.slug = unique_slug(raw or article.title, exclude_pk=article.pk)
    if "tags" in d:
        raw = d.get("tags")
        items = raw if isinstance(raw, list) else str(raw or "").split(",")
        article.tags = ", ".join(t.strip() for t in items if t.strip())[:300]
    for field, size in (("excerpt", 300), ("author_name", 80)):
        if field in d:
            setattr(article, field, (d.get(field) or "").strip()[:size])
    if not article.author_name:
        article.author_name = "Tim Urbanix"
    if "body" in d:
        article.body = d.get("body") or ""
    if "category" in d:
        cat = d.get("category")
        article.category = ArticleCategory.objects.filter(pk=cat).first() if cat not in ("", None, "null") else None
    for flag in ("is_pinned", "allow_comments"):
        if flag in d:
            setattr(article, flag, _bool(d.get(flag)))
    if "status" in d:
        if d.get("status") not in ("DRAFT", "PUBLISHED"):
            return None, "Status tidak valid."
        article.status = d.get("status")
    if "published_at" in d:
        value = d.get("published_at")
        if value in ("", None, "null"):
            article.published_at = None
        else:
            from django.utils.dateparse import parse_datetime

            parsed = parse_datetime(str(value))
            if not parsed:
                return None, "Tanggal terbit tidak valid."
            article.published_at = parsed
    if article.status == "PUBLISHED" and not article.published_at:
        article.published_at = timezone.now()

    cover = request.FILES.get("cover")
    if cover:
        if not cover.name.lower().endswith(ALLOWED_IMAGE) or cover.size > MAX_IMAGE:
            return None, "Gambar sampul harus JPG/PNG/WebP/GIF, maks. 5 MB."
        try:
            webp = to_webp(cover, MAX_COVER)
        except ImageError as exc:
            return None, str(exc)
        if article.cover:
            article.cover.delete(save=False)
        article.cover = webp
    elif d.get("cover") == "" and article.cover:
        article.cover.delete(save=False)
        article.cover = ""

    article.save()
    if "related_products" in d:
        raw = d.get("related_products")
        ids = raw if isinstance(raw, list) else [x for x in str(raw or "").split(",") if x.strip()]
        article.related_products.set(Product.objects.filter(pk__in=[int(i) for i in ids if str(i).strip().isdigit()]))
    return article, None


def _seller_detail(a: Article) -> dict:
    return {
        **_seller_row(a),
        "body": a.body,
        "excerpt_raw": a.excerpt,
        "allow_comments": a.allow_comments,
        "category_id": a.category_id,
        "related_products": [_product_row(p) for p in a.related_products.select_related("category")],
    }


@staff(["GET", "POST"])
def seller_articles(request):
    if request.method == "POST":
        article, error = _save_article(request, None)
        if error:
            return bad(error)
        return Response(_seller_detail(article), status=status.HTTP_201_CREATED)
    qs = Article.objects.select_related("category").annotate(
        approved_comments=Count("comments", filter=Q(comments__is_approved=True)),
        pending_comments=Count("comments", filter=Q(comments__is_approved=False)),
    ).order_by("-is_pinned", "-updated_at")
    st = request.query_params.get("status")
    if st in ("DRAFT", "PUBLISHED"):
        qs = qs.filter(status=st)
    q = (request.query_params.get("q") or "").strip()
    if q:
        qs = qs.filter(title__icontains=q)
    return Response(paginate(request, qs, _seller_row))


@staff(["GET", "PATCH", "DELETE"])
def seller_article_detail(request, pk):
    article = get_object_or_404(Article.objects.select_related("category"), pk=pk)
    if request.method == "DELETE":
        if article.cover:
            article.cover.delete(save=False)
        article.delete()
        return Response(status=204)
    if request.method == "PATCH":
        article, error = _save_article(request, article)
        if error:
            return bad(error)
    return Response(_seller_detail(article))


@staff(["POST"])
def seller_article_image(request):
    """Upload gambar untuk disisipkan di isi artikel. Mengembalikan URL-nya."""
    f = request.FILES.get("image")
    if not f:
        return bad("Pilih gambar dulu.")
    if not f.name.lower().endswith(ALLOWED_IMAGE) or f.size > MAX_IMAGE:
        return bad("Gambar harus JPG/PNG/WebP/GIF, maks. 5 MB.")
    try:
        webp = to_webp(f, MAX_BODY)
    except ImageError as exc:
        return bad(str(exc))
    path = default_storage.save(f"articles/body/{timezone.localdate():%Y%m}/{uuid.uuid4().hex[:12]}.webp", webp)
    return Response({"url": default_storage.url(path)}, status=201)


@staff(["GET", "POST"])
def seller_article_categories(request):
    if request.method == "POST":
        name = (request.data.get("name") or "").strip()[:60]
        if not name:
            return bad("Nama kategori wajib diisi.")
        if ArticleCategory.objects.filter(name__iexact=name).exists():
            return bad("Kategori itu sudah ada.")
        slug = slugify(name) or uuid.uuid4().hex[:8]
        c = ArticleCategory.objects.create(name=name, slug=slug, sort_order=ArticleCategory.objects.count())
        return Response({"id": c.id, "name": c.name, "slug": c.slug, "count": 0}, status=201)
    cats = ArticleCategory.objects.annotate(count=Count("articles"))
    return Response([{"id": c.id, "name": c.name, "slug": c.slug, "count": c.count} for c in cats])


@staff(["PATCH", "DELETE"])
def seller_article_category_detail(request, pk):
    c = get_object_or_404(ArticleCategory, pk=pk)
    if request.method == "DELETE":
        c.delete()
        return Response(status=204)
    name = (request.data.get("name") or "").strip()[:60]
    if not name:
        return bad("Nama kategori wajib diisi.")
    c.name = name
    c.save(update_fields=["name"])
    return Response({"id": c.id, "name": c.name, "slug": c.slug})


def _seller_comment(c: ArticleComment) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "email": c.email,
        "body": c.body,
        "is_approved": c.is_approved,
        "is_staff_reply": c.is_staff_reply,
        "gif_url": c.gif_url,
        "parent_id": c.parent_id,
        "created_at": c.created_at,
        "article": {"id": c.article_id, "title": c.article.title, "slug": c.article.slug},
    }


@staff(["GET"])
def seller_comments(request):
    qs = ArticleComment.objects.select_related("article").order_by("-created_at")
    st = request.query_params.get("status")
    if st == "pending":
        qs = qs.filter(is_approved=False)
    elif st == "approved":
        qs = qs.filter(is_approved=True)
    data = paginate(request, qs, _seller_comment)
    data["pending"] = ArticleComment.objects.filter(is_approved=False).count()
    return Response(data)


@staff(["PATCH", "DELETE", "POST"])
def seller_comment_detail(request, pk):
    c = get_object_or_404(ArticleComment.objects.select_related("article"), pk=pk)
    if request.method == "DELETE":
        c.delete()
        return Response(status=204)
    if request.method == "POST":  # balasan admin
        body = (request.data.get("body") or "").strip()
        if len(body) < 2:
            return bad("Balasan terlalu pendek.")
        root = c.parent or c
        if not root.is_approved:
            root.is_approved = True
            root.save(update_fields=["is_approved"])
        reply = ArticleComment.objects.create(
            article=c.article, parent=root, name=(request.data.get("name") or "Admin Urbanix")[:60],
            body=body[:1500], is_approved=True, is_staff_reply=True,
        )
        return Response(_seller_comment(reply), status=201)
    if "is_approved" in request.data:
        c.is_approved = _bool(request.data.get("is_approved"))
        c.save(update_fields=["is_approved"])
    return Response(_seller_comment(c))
