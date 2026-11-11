"""Artikel Urbanix (menu "Inspirasi"): API publik + API Seller Center."""

from __future__ import annotations

import re
import uuid

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

from .models import Article, ArticleCategory, ArticleComment, Product
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


def _comment(c: ArticleComment) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "body": c.body,
        "created_at": c.created_at,
        "is_staff_reply": c.is_staff_reply,
        "replies": [
            {"id": r.id, "name": r.name, "body": r.body, "created_at": r.created_at, "is_staff_reply": r.is_staff_reply}
            for r in c.replies.all()
            if r.is_approved
        ],
    }


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
        article.comments.filter(is_approved=True, parent__isnull=True).prefetch_related("replies")
        if article.allow_comments else []
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


@api_view(["POST"])
@_public
@throttle_classes([CommentThrottle])
def article_comment(request, slug):
    article = get_object_or_404(published(), slug=slug)
    if not article.allow_comments:
        return bad("Komentar untuk artikel ini ditutup.")
    data = request.data
    if (data.get("website") or "").strip():  # jebakan bot: kolom tersembunyi harus kosong
        return Response({"message": "Terima kasih! Komentarmu akan tampil setelah dicek admin."}, status=201)
    name = (data.get("name") or "").strip()[:60]
    body = (data.get("body") or "").strip()
    email = (data.get("email") or "").strip()[:254]
    if len(name) < 2:
        return bad("Nama minimal 2 huruf.")
    if len(body) < 3:
        return bad("Komentar terlalu pendek.")
    if len(body) > 1500:
        return bad("Komentar maksimal 1.500 karakter.")
    if email and not re.match(r"^\S+@\S+\.\S+$", email):
        return bad("Email tidak valid.")
    if len(re.findall(r"https?://|www\.", body, flags=re.I)) > 1:
        return bad("Komentar berisi terlalu banyak link.")
    ArticleComment.objects.create(article=article, name=name, email=email, body=body)
    return Response({"message": "Terima kasih! Komentarmu akan tampil setelah dicek admin."}, status=201)


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
        if article.cover:
            article.cover.delete(save=False)
        article.cover = cover
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
    ext = f.name.rsplit(".", 1)[-1].lower()
    path = default_storage.save(f"articles/body/{timezone.localdate():%Y%m}/{uuid.uuid4().hex[:12]}.{ext}", f)
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
