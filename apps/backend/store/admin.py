from django.contrib import admin

from .models import (
    Category,
    Order,
    OrderItem,
    PaymentEvent,
    Product,
    ProductVariation,
    StoreSettings,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug")
    search_fields = ("name",)


class ProductVariationInline(admin.TabularInline):
    model = ProductVariation
    extra = 0
    fields = ("name", "sku", "price", "stock", "variation_id")
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
        "idempotency_key",
    )
    fieldsets = (
        ("Pesanan", {"fields": ("order_number", "created_at", "status", "total_amount", "notes")}),
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

    def has_add_permission(self, request):
        return not StoreSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
