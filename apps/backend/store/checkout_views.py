"""Endpoint checkout tamu. Tidak memakai autentikasi/CSRF karena dipanggil dari proxy Next.js."""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from . import checkout_service as svc
from .checkout_serializers import CheckoutSerializer, QuoteSerializer
from .models import Order, StoreSettings


def _public(view):
    view = authentication_classes([])(view)
    return permission_classes([AllowAny])(view)


@api_view(["GET"])
@_public
def store_settings(request):
    store = StoreSettings.load()
    return Response(
        {
            "methods": svc.available_methods(store),
            "whatsapp_number": store.whatsapp_number,
            "shopee_store_url": store.shopee_store_url,
        }
    )


@api_view(["POST"])
@_public
@throttle_classes([ScopedRateThrottle])
def checkout_quote(request):
    serializer = QuoteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        return Response(svc.quote(serializer.validated_data["items"]))
    except svc.CheckoutError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


checkout_quote.cls.throttle_scope = "checkout_quote"


@api_view(["POST"])
@_public
@throttle_classes([ScopedRateThrottle])
def checkout(request):
    serializer = CheckoutSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        result = svc.place_order(serializer.validated_data)
    except svc.CheckoutError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(result, status=status.HTTP_201_CREATED)


checkout.cls.throttle_scope = "checkout"


@api_view(["GET"])
@_public
def order_detail(request, order_number):
    """Ringkasan pesanan untuk halaman /pesanan/<no>. Data pribadi (alamat, HP) tidak ditampilkan."""
    order = get_object_or_404(
        Order.objects.prefetch_related("items"), order_number=order_number
    )
    return Response(
        {
            "order_number": order.order_number,
            "created_at": order.created_at,
            "customer_name": order.customer_name,
            "payment_method": order.payment_method,
            "payment_status": order.payment_status,
            "status": order.status,
            "total_amount": str(order.total_amount),
            "shipping_note": "Ongkos kirim dikonfirmasi penjual.",
            "payment_url": order.payment_url if order.payment_status == "UNPAID" else "",
            "whatsapp_url": svc.whatsapp_url(order) if order.payment_method == "WHATSAPP" else "",
            "items": [
                {
                    "product_id": item.product_id,
                    "name": item.product_name,
                    "unit_price": str(item.price_snapshot),
                    "quantity": item.quantity,
                    "subtotal": str(item.price_snapshot * item.quantity),
                }
                for item in order.items.all()
            ],
        }
    )


@api_view(["POST"])
@_public
def midtrans_webhook(request):
    code, message = svc.handle_midtrans_notification(dict(request.data))
    return Response({"status": message}, status=code)
