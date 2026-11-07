
from django.db import models
from django.contrib.auth.models import User
import uuid


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category,
        related_name="products",
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    sku = models.CharField(max_length=50, unique=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    discount_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    stock = models.PositiveIntegerField(default=0)
    image_url = models.URLField(
        default="https://via.placeholder.com/400x400?text=URBANIX+Product"
    )
    is_active = models.BooleanField(default=True)
    shopee_url = models.URLField(
        "Link Shopee",
        max_length=500,
        blank=True,
        help_text="Link produk ini di Shopee. Kosongkan untuk memakai link toko di Pengaturan toko.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def final_price(self):
        """Harga yang dibayar pembeli: harga diskon bila valid, kalau tidak harga normal."""
        if self.discount_price and 0 < self.discount_price < self.price:
            return self.discount_price
        return self.price


class StoreSettings(models.Model):
    """Pengaturan toko (hanya satu baris). Diubah lewat admin Django."""

    whatsapp_number = models.CharField(
        "Nomor WhatsApp toko",
        max_length=20,
        blank=True,
        help_text="Format internasional tanpa + atau spasi, contoh: 6281234567890.",
    )
    shopee_store_url = models.URLField(
        "Link toko Shopee",
        max_length=500,
        blank=True,
        help_text="Dipakai bila produk belum punya link Shopee sendiri.",
    )
    enable_midtrans = models.BooleanField(
        "Aktifkan bayar di web (Midtrans)",
        default=True,
        help_text="Tetap nonaktif selama MIDTRANS_SERVER_KEY belum diisi.",
    )
    enable_whatsapp = models.BooleanField("Aktifkan pesan via WhatsApp", default=True)
    enable_shopee = models.BooleanField("Aktifkan beli via Shopee", default=True)

    class Meta:
        verbose_name = "Pengaturan toko"
        verbose_name_plural = "Pengaturan toko"

    def __str__(self):
        return "Pengaturan toko"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class ProductVariation(models.Model):
    product = models.ForeignKey(
        Product,
        related_name="variations",
        on_delete=models.CASCADE,
    )
    variation_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255, blank=True)
    sku = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.product.name} - {self.name}"


class Cart(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    session_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart {self.id} for {self.user or self.session_id}"


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        related_name="items",
        on_delete=models.CASCADE,
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ("cart", "product")


class Order(models.Model):
    STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("PROCESSING", "Processing"),
        ("SHIPPED", "Shipped"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    )

    PAYMENT_STATUS_CHOICES = (
        ("UNPAID", "Unpaid"),
        ("PAID", "Paid"),
        ("FAILED", "Failed"),
        ("EXPIRED", "Expired"),
    )

    order_number = models.CharField(
        max_length=50,
        unique=True,
        default=uuid.uuid4,
    )
    PAYMENT_METHOD_CHOICES = (
        ("MIDTRANS", "Bayar di web (Midtrans)"),
        ("WHATSAPP", "Via WhatsApp"),
    )

    user = models.ForeignKey(
        User,
        related_name="orders",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    customer_name = models.CharField("Nama pembeli", max_length=120, blank=True)
    customer_phone = models.CharField("No. HP pembeli", max_length=20, blank=True)
    customer_email = models.EmailField("Email pembeli", blank=True)
    shipping_city = models.CharField("Kota/Kabupaten", max_length=100, blank=True)
    shipping_province = models.CharField("Provinsi", max_length=100, blank=True)
    shipping_postal_code = models.CharField("Kode pos", max_length=10, blank=True)
    notes = models.TextField("Catatan untuk penjual", blank=True)
    payment_method = models.CharField(
        "Metode pembayaran",
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        blank=True,
    )
    payment_url = models.URLField("Link pembayaran", max_length=500, blank=True)
    stock_reserved = models.BooleanField(
        "Stok sudah dikurangi",
        default=False,
        help_text="True bila stok pesanan ini sedang dipotong (dikembalikan otomatis saat gagal/kedaluwarsa).",
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    shipping_address = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING",
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="UNPAID",
    )
    snap_token = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )
    idempotency_key = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order {self.order_number} - {self.status}"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        related_name="items",
        on_delete=models.CASCADE,
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
    )
    product_name = models.CharField(max_length=255)
    price_snapshot = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField()

    def __str__(self):
        return (
            f"{self.quantity}x {self.product_name} "
            f"on {self.order.order_number}"
        )


class PaymentEvent(models.Model):
    order = models.ForeignKey(
        Order,
        related_name="payment_events",
        on_delete=models.CASCADE,
    )
    transaction_id = models.CharField(max_length=100)
    event_type = models.CharField(max_length=50)
    raw_payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)


class AuditLog(models.Model):
    actor = models.ForeignKey(
        User,
        null=True,
        on_delete=models.SET_NULL,
    )
    action = models.CharField(max_length=100)
    details = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
