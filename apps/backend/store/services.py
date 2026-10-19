import hashlib
import requests
from django.conf import settings
from django.db import transaction
from .models import Order, OrderItem, Product, PaymentEvent, AuditLog

class MidtransService:
    @staticmethod
    def generate_signature(order_id, status_code, gross_amount, server_key):
        raw_string = f"{order_id}{status_code}{gross_amount}{server_key}"
        return hashlib.sha512(raw_string.encode('utf-8')).hexdigest()

    @staticmethod
    def create_snap_transaction(order):
        # Placeholder for Snap API call or simulated sandbox token
        base_url = "https://app.sandbox.midtrans.com/snap/v1/transactions"
        payload = {
            "transaction_details": {
                "order_id": str(order.order_number),
                "gross_amount": int(order.total_amount)
            },
            "credit_card": {
                "secure": True
            },
            "customer_details": {
                "email": order.user.email,
                "first_name": order.user.username
            }
        }
        # Under standard sandbox fallback, generate token:
        snap_token = f"SNAP-TOKEN-SIMULATED-{order.order_number}"
        return snap_token

class OrderService:
    @staticmethod
    @transaction.atomic
    def create_order_from_cart(user, cart, shipping_address, idempotency_key=None):
        if idempotency_key:
            existing = Order.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                return existing

        items = cart.items.select_related('product').all()
        if not items.exists():
            raise ValueError("Cart is empty.")

        total_amount = 0
        for item in items:
            # Atomic lock check stock
            product = Product.objects.select_for_update().get(id=item.product.id)
            if product.stock < item.quantity:
                raise ValueError(f"Stok produk {product.name} tidak mencukupi (Tersedia: {product.stock}).")
            
            # Reduce stock atomically
            product.stock -= item.quantity
            product.save()

            total_amount += (product.discount_price or product.price) * item.quantity

        order = Order.objects.create(
            user=user,
            total_amount=total_amount,
            shipping_address=shipping_address,
            idempotency_key=idempotency_key
        )

        for item in items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                product_name=item.product.name,
                price_snapshot=item.product.discount_price or item.product.price,
                quantity=item.quantity
            )

        # Clear Cart
        cart.items.all().delete()

        # Generate Midtrans Snap Token
        snap_token = MidtransService.create_snap_transaction(order)
        order.snap_token = snap_token
        order.save()

        AuditLog.objects.create(actor=user, action="ORDER_CREATED", details=f"Order {order.order_number} created.")
        return order
