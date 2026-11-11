import re

from rest_framework import serializers

PHONE_RE = re.compile(r"^(\+62|62|0)8[0-9]{7,12}$")


class CheckoutItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    variation_id = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class QuoteSerializer(serializers.Serializer):
    items = CheckoutItemSerializer(many=True, allow_empty=False, max_length=50)
    voucher_codes = serializers.ListField(
        child=serializers.CharField(max_length=30), required=False, max_length=5, default=list
    )


class CustomerSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, trim_whitespace=True)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True, default="")

    def validate_phone(self, value):
        cleaned = re.sub(r"[\s\-().]", "", value)
        if not PHONE_RE.match(cleaned):
            raise serializers.ValidationError(
                "Nomor HP tidak valid. Contoh: 081234567890."
            )
        return cleaned


class ShippingSerializer(serializers.Serializer):
    address = serializers.CharField(max_length=500)
    city = serializers.CharField(max_length=100)
    province = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    postal_code = serializers.RegexField(
        r"^[0-9]{5}$",
        required=False,
        allow_blank=True,
        default="",
        error_messages={"invalid": "Kode pos harus 5 angka."},
    )


class QuoteRequestSerializer(QuoteSerializer):
    payment_method = serializers.ChoiceField(
        choices=["MIDTRANS", "WHATSAPP", "SHOPEE"], required=False, allow_null=True, default=None
    )
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")


class CheckoutSerializer(QuoteSerializer):
    payment_method = serializers.ChoiceField(choices=["MIDTRANS", "WHATSAPP", "SHOPEE"])
    # Data pembeli tidak dibutuhkan untuk Shopee (pembeli mengisinya di Shopee).
    customer = CustomerSerializer(required=False)
    shipping = ShippingSerializer(required=False)
    notes = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["payment_method"] != "SHOPEE":
            errors = {}
            if not attrs.get("customer"):
                errors["customer"] = ["Data pembeli wajib diisi."]
            if not attrs.get("shipping"):
                errors["shipping"] = ["Alamat pengiriman wajib diisi."]
            if errors:
                raise serializers.ValidationError(errors)
        return attrs
