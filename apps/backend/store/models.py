
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
        "Gambar utama",
        max_length=500,
        default="https://via.placeholder.com/400x400?text=URBANIX+Product"
    )
    images = models.JSONField(
        "Gambar lainnya",
        default=list,
        blank=True,
        help_text="Daftar link gambar tambahan (maks. 8, urutan sesuai slide Shopee).",
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

    def buyable_variations(self):
        """Varian yang harus dipilih pembeli.

        Produk dengan satu varian tanpa nama dianggap produk biasa (tidak perlu memilih).
        """
        variations = list(self.variations.all())
        if len(variations) > 1 or (variations and variations[0].name.strip()):
            return variations
        return []

    def sync_stock_from_variations(self, save=True):
        """Stok induk = jumlah stok semua varian (bila produk punya varian)."""
        total = self.variations.aggregate(total=models.Sum("stock"))["total"]
        if total is not None and total != self.stock:
            self.stock = total
            if save:
                Product.objects.filter(pk=self.pk).update(stock=total)
        return self.stock

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
        help_text="Contoh: 6281234567890. Boleh diketik 0812..., +62 812..., atau dengan spasi; dirapikan otomatis saat disimpan.",
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

    show_whatsapp_popup = models.BooleanField(
        "Tampilkan popup voucher di beranda",
        default=True,
        help_text="Voucher yang tampil = voucher dengan centang \"Tampilkan di popup\".",
    )
    voucher_combo_min_purchase = models.DecimalField(
        "Min. belanja untuk menggabung 2 voucher (Rp)",
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text="Voucher diskon + voucher gratis ongkir hanya bisa dipakai bersamaan mulai nilai belanja ini. 0 = selalu bisa digabung.",
    )

    # Ringkasan rating toko di Shopee (diisi manual, dilihat di halaman penilaian toko Shopee)
    shopee_rating = models.DecimalField(
        "Rating toko di Shopee", max_digits=2, decimal_places=1, null=True, blank=True,
        help_text="Contoh: 4.9",
    )
    shopee_rating_count = models.PositiveIntegerField("Jumlah penilaian di Shopee", null=True, blank=True)
    shopee_reviews_url = models.URLField(
        "Link halaman penilaian Shopee", max_length=500, blank=True,
        help_text="Tombol \"Baca semua ulasan\" mengarah ke sini.",
    )

    class Meta:
        verbose_name = "Pengaturan toko"
        verbose_name_plural = "Pengaturan toko"

    def __str__(self):
        return "Pengaturan toko"

    @staticmethod
    def normalize_whatsapp(number):
        """'+62 812-3456-7890' / '0812...' -> '628123456789...' (format wa.me)."""
        digits = "".join(ch for ch in (number or "") if ch.isdigit())
        if digits.startswith("0"):
            digits = "62" + digits[1:]
        return digits

    def save(self, *args, **kwargs):
        self.pk = 1
        self.whatsapp_number = self.normalize_whatsapp(self.whatsapp_number)
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(
            pk=1,
            defaults={"shopee_reviews_url": "https://shopee.co.id/buyer/4752546503/rating?shop_id=1735329821"},
        )
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
    image_url = models.URLField("Gambar varian", max_length=500, blank=True)

    class Meta:
        verbose_name = "Varian"
        verbose_name_plural = "Varian"

    def __str__(self):
        return f"{self.product.name} - {self.name}" if self.name else self.product.name


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
    discount_amount = models.DecimalField("Potongan", max_digits=12, decimal_places=2, default=0)
    discount_note = models.CharField("Keterangan potongan", max_length=255, blank=True)
    voucher_codes = models.CharField("Kode voucher", max_length=100, blank=True)
    shipping_discount_max = models.DecimalField(
        "Potongan ongkir maks. (Rp)", max_digits=12, decimal_places=2, default=0,
        help_text="Dari voucher gratis ongkir; dipotong saat ongkir dikonfirmasi.",
    )
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
    variation = models.ForeignKey(
        "ProductVariation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    product_name = models.CharField(max_length=255)
    variation_name = models.CharField("Varian", max_length=255, blank=True)
    sku = models.CharField("SKU", max_length=100, blank=True)
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


class PriceCut(models.Model):
    """Promo potong harga (menu "Potong harga" di admin)."""

    name = models.CharField("Nama promo", max_length=120, help_text="Contoh: Promo 11.11, Flash Sale Akhir Bulan")
    starts_at = models.DateTimeField("Mulai", null=True, blank=True, help_text="Kosongkan = langsung berlaku.")
    ends_at = models.DateTimeField("Selesai", null=True, blank=True, help_text="Kosongkan = berlaku sampai dimatikan.")
    is_active = models.BooleanField("Aktif", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Potong harga"
        verbose_name_plural = "Potong harga"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    def is_running(self, now=None):
        from django.utils import timezone

        now = now or timezone.now()
        return (
            self.is_active
            and (self.starts_at is None or self.starts_at <= now)
            and (self.ends_at is None or self.ends_at >= now)
        )

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "Waktu selesai harus setelah waktu mulai."})


class PriceCutItem(models.Model):
    """Satu produk/varian di dalam promo. Isi harga promo ATAU persen potongan."""

    price_cut = models.ForeignKey(PriceCut, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(
        Product, related_name="price_cut_items", on_delete=models.CASCADE, verbose_name="Produk"
    )
    variation = models.ForeignKey(
        ProductVariation,
        related_name="price_cut_items",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name="Varian",
        help_text="Kosongkan = berlaku untuk produk (semua varian bila memakai persen).",
    )
    promo_price = models.DecimalField(
        "Harga promo", max_digits=12, decimal_places=2, null=True, blank=True
    )
    discount_percent = models.DecimalField(
        "Potongan (%)", max_digits=5, decimal_places=2, null=True, blank=True
    )

    class Meta:
        verbose_name = "Produk promo"
        verbose_name_plural = "Produk promo"

    def __str__(self):
        target = self.variation or self.product
        return f"{target} ({self.price_cut})"

    def clean(self):
        from django.core.exceptions import ValidationError

        if (self.promo_price is None) == (self.discount_percent is None):
            raise ValidationError("Isi salah satu: Harga promo ATAU Potongan (%).")
        if self.discount_percent is not None and not (0 < self.discount_percent < 100):
            raise ValidationError({"discount_percent": "Potongan harus antara 0 dan 100%."})
        if self.variation_id and self.product_id and self.variation.product_id != self.product_id:
            raise ValidationError({"variation": "Varian ini bukan milik produk yang dipilih."})
        if self.promo_price is not None:
            if self.promo_price <= 0:
                raise ValidationError({"promo_price": "Harga promo harus lebih dari 0."})
            if self.product_id and not self.variation_id and self.product.buyable_variations():
                raise ValidationError(
                    {"variation": "Produk ini punya varian: pilih variannya, atau pakai Potongan (%) untuk semua varian."}
                )
            normal = self.variation.price if self.variation_id else (self.product.price if self.product_id else None)
            if normal is not None and self.promo_price >= normal:
                raise ValidationError({"promo_price": f"Harga promo harus di bawah harga normal ({normal:,.0f})."})


class Review(models.Model):
    """Ulasan asli pembeli (disalin dari halaman penilaian Shopee atau dari pembeli langsung)."""

    SOURCE_CHOICES = (("SHOPEE", "Shopee"), ("WEBSITE", "Website / WhatsApp"))

    customer_name = models.CharField(
        "Nama pembeli", max_length=80,
        help_text="Ditampilkan tersamar otomatis, contoh: b***i.",
    )
    rating = models.PositiveSmallIntegerField("Bintang (1-5)", default=5)
    text = models.TextField("Isi ulasan", blank=True)
    product = models.ForeignKey(
        Product, related_name="reviews", on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name="Produk",
    )
    product_name = models.CharField(
        "Nama produk (dari Shopee)", max_length=255, blank=True,
        help_text="Dipakai bila produk tidak ditemukan di katalog.",
    )
    variation_name = models.CharField("Varian", max_length=255, blank=True)
    review_date = models.DateField("Tanggal ulasan", null=True, blank=True)
    source = models.CharField("Sumber", max_length=10, choices=SOURCE_CHOICES, default="SHOPEE")
    is_published = models.BooleanField("Tampilkan di website", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Ulasan"
        verbose_name_plural = "Ulasan"
        ordering = ["-review_date", "-created_at"]

    def __str__(self):
        return f"{self.rating}★ {self.customer_name}"

    def clean(self):
        from django.core.exceptions import ValidationError

        if not 1 <= self.rating <= 5:
            raise ValidationError({"rating": "Bintang harus 1 sampai 5."})

    @property
    def masked_name(self):
        name = self.customer_name.strip()
        if len(name) <= 2:
            return name[:1] + "*"
        return f"{name[0]}***{name[-1]}"


class Voucher(models.Model):
    """Voucher toko (menu "Voucher" di admin). Dipakai di checkout lewat kode."""

    TYPE_CHOICES = (
        ("PERCENT", "Diskon persen"),
        ("FIXED", "Diskon nominal (Rp)"),
        ("FREE_SHIPPING", "Gratis ongkir (potongan ongkir maks. Rp)"),
    )

    code = models.CharField(
        "Kode", max_length=30, unique=True,
        help_text="Huruf/angka tanpa spasi, contoh: WAHEMAT5. Otomatis huruf besar.",
    )
    title = models.CharField("Judul", max_length=80, help_text="Contoh: Diskon 5% pesan via WhatsApp")
    terms = models.TextField(
        "Syarat & ketentuan", blank=True,
        help_text="Satu poin per baris. Tampil di kartu voucher.",
    )
    voucher_type = models.CharField("Jenis", max_length=15, choices=TYPE_CHOICES, default="PERCENT")
    value = models.DecimalField(
        "Nilai", max_digits=12, decimal_places=2,
        help_text="Persen untuk diskon persen (5 = 5%); rupiah untuk diskon nominal dan gratis ongkir.",
    )
    max_discount = models.DecimalField(
        "Maks. potongan (Rp)", max_digits=12, decimal_places=0, null=True, blank=True,
        help_text="Hanya untuk diskon persen. Kosongkan = tanpa batas.",
    )
    min_purchase = models.DecimalField("Min. belanja (Rp)", max_digits=12, decimal_places=0, default=0)
    for_whatsapp = models.BooleanField("Berlaku untuk pesan via WhatsApp", default=True)
    for_midtrans = models.BooleanField("Berlaku untuk bayar di web (Midtrans)", default=True)
    exclude_promo = models.BooleanField(
        "Tidak berlaku untuk produk yang sedang promo", default=True,
        help_text="Diskon hanya dihitung dari produk yang tidak ikut Potong harga.",
    )
    can_combine = models.BooleanField(
        "Boleh digabung dengan voucher lain", default=True,
        help_text="Maks. 1 voucher diskon + 1 voucher gratis ongkir per pesanan.",
    )
    usage_limit = models.PositiveIntegerField("Kuota total", null=True, blank=True, help_text="Kosongkan = tanpa batas.")
    per_customer_limit = models.PositiveIntegerField(
        "Maks. pemakaian per pembeli", null=True, blank=True,
        help_text="Dihitung dari nomor HP/WhatsApp pembeli. Kosongkan = tanpa batas.",
    )
    starts_at = models.DateTimeField("Mulai", null=True, blank=True)
    ends_at = models.DateTimeField("Selesai", null=True, blank=True)
    is_active = models.BooleanField("Aktif", default=True)
    is_public = models.BooleanField(
        "Tampilkan untuk diklaim", default=True,
        help_text="Tampil di beranda, halaman produk, dan checkout. Matikan untuk voucher rahasia (hanya lewat kode).",
    )
    show_in_popup = models.BooleanField("Tampilkan di popup beranda", default=False)
    sort_order = models.PositiveSmallIntegerField("Urutan tampil", default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Voucher"
        verbose_name_plural = "Voucher"
        ordering = ["sort_order", "-created_at"]

    def __str__(self):
        return f"{self.code} - {self.title}"

    def save(self, *args, **kwargs):
        self.code = "".join(self.code.split()).upper()
        super().save(*args, **kwargs)

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.value is None or self.value <= 0:
            raise ValidationError({"value": "Nilai harus lebih dari 0."})
        if self.voucher_type == "PERCENT" and self.value >= 100:
            raise ValidationError({"value": "Diskon persen harus di bawah 100."})
        if not (self.for_whatsapp or self.for_midtrans):
            raise ValidationError("Pilih minimal satu metode: WhatsApp atau Midtrans.")
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "Waktu selesai harus setelah waktu mulai."})

    def is_running(self, now=None):
        from django.utils import timezone

        now = now or timezone.now()
        return (
            self.is_active
            and (self.starts_at is None or self.starts_at <= now)
            and (self.ends_at is None or self.ends_at >= now)
        )

    @property
    def is_shipping(self):
        return self.voucher_type == "FREE_SHIPPING"

    def used_count(self, phone=None):
        qs = Order.objects.exclude(status="CANCELLED").filter(voucher_codes__regex=rf"(^|,){self.code}(,|$)")
        if phone:
            digits = "".join(ch for ch in phone if ch.isdigit())
            local = "0" + digits[2:] if digits.startswith("62") else digits
            intl = "62" + digits[1:] if digits.startswith("0") else digits
            qs = qs.filter(customer_phone__in={phone, digits, local, intl, "+" + intl})
        return qs.count()

