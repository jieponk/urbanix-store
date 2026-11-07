from django.contrib import admin

from .models import (
    Category,
    Order,
    OrderItem,
    PaymentEvent,
    PriceCut,
    PriceCutItem,
    Product,
    ProductVariation,
    Review,
    StoreSettings,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug")
    search_fields = ("name",)


class ProductVariationInline(admin.TabularInline):
    model = ProductVariation
    extra = 0
    fields = ("name", "sku", "price", "stock", "image_url", "variation_id")
    readonly_fields = ("variation_id",)
    verbose_name = "Varian"
    verbose_name_plural = "Varian (stok induk = jumlah stok semua varian, dihitung otomatis)"

    def has_add_permission(self, request, obj=None):
        return False  # varian berasal dari data Shopee


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "sku", "price", "stock", "is_active", "has_shopee_url")
    list_filter = ("is_active", "category")
    search_fields = ("name", "sku", "variations__sku")
    inlines = [ProductVariationInline]

    def get_readonly_fields(self, request, obj=None):
        # Untuk produk bervarian, stok diatur per varian di tabel bawah.
        if obj and obj.variations.exists():
            return ("stock",)
        return ()

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        form.instance.sync_stock_from_variations()

    @admin.display(boolean=True, description="Link Shopee")
    def has_shopee_url(self, obj):
        return bool(obj.shopee_url)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    fields = ("product", "product_name", "variation_name", "sku", "price_snapshot", "quantity")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


class PaymentEventInline(admin.TabularInline):
    model = PaymentEvent
    extra = 0
    can_delete = False
    readonly_fields = ("transaction_id", "event_type", "created_at", "raw_payload")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "created_at",
        "customer_name",
        "customer_phone",
        "payment_method",
        "payment_status",
        "status",
        "total_amount",
    )
    list_filter = ("payment_method", "payment_status", "status", "created_at")
    search_fields = ("order_number", "customer_name", "customer_phone", "customer_email")
    date_hierarchy = "created_at"
    inlines = [OrderItemInline, PaymentEventInline]
    readonly_fields = (
        "order_number",
        "created_at",
        "user",
        "payment_method",
        "payment_status",
        "payment_url",
        "snap_token",
        "stock_reserved",
        "total_amount",
        "discount_amount",
        "discount_note",
        "idempotency_key",
    )
    fieldsets = (
        (
            "Pesanan",
            {"fields": ("order_number", "created_at", "status", "total_amount", "discount_amount", "discount_note", "notes")},
        ),
        ("Pembeli", {"fields": ("customer_name", "customer_phone", "customer_email", "user")}),
        (
            "Pengiriman",
            {"fields": ("shipping_address", "shipping_city", "shipping_province", "shipping_postal_code")},
        ),
        (
            "Pembayaran",
            {
                "fields": (
                    "payment_method",
                    "payment_status",
                    "payment_url",
                    "snap_token",
                    "stock_reserved",
                    "idempotency_key",
                )
            },
        ),
    )


@admin.register(StoreSettings)
class StoreSettingsAdmin(admin.ModelAdmin):
    list_display = ("__str__", "whatsapp_number", "enable_midtrans", "enable_whatsapp", "enable_shopee")
    fieldsets = (
        ("Kontak & marketplace", {"fields": ("whatsapp_number", "shopee_store_url")}),
        ("Metode pembayaran", {"fields": ("enable_midtrans", "enable_whatsapp", "enable_shopee")}),
        (
            "Diskon pesan via WhatsApp",
            {"fields": ("whatsapp_discount_percent", "whatsapp_discount_on_promo", "show_whatsapp_popup")},
        ),
        (
            "Rating toko di Shopee",
            {
                "fields": ("shopee_rating", "shopee_rating_count", "shopee_reviews_url"),
                "description": "Salin angka rating dan jumlah penilaian dari halaman penilaian toko di Shopee.",
            },
        ),
    )

    def has_add_permission(self, request):
        return not StoreSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ProductVariation)
class ProductVariationAdmin(admin.ModelAdmin):
    """Dipakai untuk pencarian varian di menu Potong harga."""

    list_display = ("__str__", "sku", "price", "stock")
    search_fields = ("name", "sku", "product__name", "product__sku")
    list_select_related = ("product",)

    def has_module_permission(self, request):
        return False  # tidak tampil di menu; varian diedit dari halaman produk


class PriceCutItemInline(admin.TabularInline):
    model = PriceCutItem
    extra = 1
    autocomplete_fields = ("product", "variation")
    fields = ("product", "variation", "normal_price", "promo_price", "discount_percent")
    readonly_fields = ("normal_price",)

    @admin.display(description="Harga normal")
    def normal_price(self, obj):
        if not obj or not obj.product_id:
            return "-"
        price = obj.variation.price if obj.variation_id else obj.product.price
        return f"Rp{price:,.0f}".replace(",", ".")


@admin.register(PriceCut)
class PriceCutAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "starts_at", "ends_at", "item_count")
    list_filter = ("is_active",)
    search_fields = ("name", "items__product__name", "items__variation__sku")
    inlines = [PriceCutItemInline]

    @admin.display(description="Status")
    def status(self, obj):
        if not obj.is_active:
            return "Nonaktif"
        return "Berjalan" if obj.is_running() else "Terjadwal / selesai"

    @admin.display(description="Jumlah produk")
    def item_count(self, obj):
        return obj.items.count()


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("customer_name", "rating", "short_text", "product", "review_date", "source", "is_published")
    list_editable = ("is_published",)
    list_filter = ("is_published", "rating", "source")
    search_fields = ("customer_name", "text", "product__name")
    autocomplete_fields = ("product",)
    date_hierarchy = "review_date"
    fields = ("customer_name", "rating", "text", "product", "variation_name", "review_date", "source", "is_published")

    @admin.display(description="Ulasan")
    def short_text(self, obj):
        return (obj.text[:70] + "…") if len(obj.text) > 70 else obj.text
