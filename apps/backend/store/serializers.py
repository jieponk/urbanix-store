from rest_framework import serializers
from django.contrib.auth.models import User
from .pricing import price_info
from .models import Category, Product, ProductVariation, Cart, CartItem, Order, OrderItem, PaymentEvent

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class ProductVariationSerializer(serializers.ModelSerializer):
    final_price = serializers.SerializerMethodField()
    discount_percent = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariation
        fields = ('variation_id', 'name', 'sku', 'price', 'final_price', 'discount_percent', 'stock', 'image_url')

    def _info(self, obj):
        return price_info(obj.product, obj)

    def get_final_price(self, obj):
        return str(self._info(obj).final)

    def get_discount_percent(self, obj):
        return self._info(obj).discount_percent


class ProductSerializer(serializers.ModelSerializer):
    """
    price          : harga normal (untuk produk bervarian: harga normal varian termurah setelah promo)
    final_price    : harga yang dibayar (termurah, termasuk promo)
    discount_percent, promo_name, promo_ends_at : untuk label diskon
    """
    category_name = serializers.CharField(source='category.name', read_only=True)
    variations = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()
    discount_percent = serializers.SerializerMethodField()
    promo_name = serializers.SerializerMethodField()
    promo_ends_at = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def _variations(self, obj):
        # Pastikan setiap varian memakai objek produk yang sama (berisi data promo yang sudah di-prefetch).
        variations = list(obj.variations.all())
        for v in variations:
            v.product = obj
        return variations

    def _best(self, obj):
        cache = getattr(obj, '_best_price', None)
        if cache is None:
            variants = obj.buyable_variations()
            if variants:
                for v in variants:
                    v.product = obj
                infos = [price_info(obj, v) for v in variants]
                cache = min(infos, key=lambda i: (i.final, -i.discount_percent))
            else:
                cache = price_info(obj)
            obj._best_price = cache
        return cache

    def to_representation(self, obj):
        data = super().to_representation(obj)
        if obj.buyable_variations():
            data['price'] = str(self._best(obj).normal)
            data['discount_price'] = None
        return data

    def get_variations(self, obj):
        return ProductVariationSerializer(self._variations(obj), many=True).data

    def get_final_price(self, obj):
        return str(self._best(obj).final)

    def get_discount_percent(self, obj):
        return self._best(obj).discount_percent

    def get_promo_name(self, obj):
        return self._best(obj).promo_name

    def get_promo_ends_at(self, obj):
        ends = self._best(obj).promo_ends_at
        return ends.isoformat() if ends else None

class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = CartItem
        fields = ('id', 'product', 'product_id', 'quantity')

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    # Ubah baris di bawah ini:
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ('id', 'user', 'items', 'total_price')

    def get_total_price(self, obj):
        return sum(item.product.price * item.quantity for item in obj.items.all())
        
class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = '__all__'

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ('order_number', 'total_amount', 'status', 'payment_status', 'snap_token')
