from django.contrib import admin

from .models import Category, Order, OrderItem, PaymentEvent, Product, StoreSettings


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug")
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "sku", "price", "stock", "is_active", "has_shopee_url")
    list_filter = ("is_active", "category")
    search_fields = ("name", "sku")

    @admin.display(boolean=True, description="Link Shopee")
    def has_shopee_url(self, obj):
        return bool(obj.shopee_url)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ("product", "product_name", "price_snapshot", "quantity")

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
