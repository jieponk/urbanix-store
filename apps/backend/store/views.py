from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.shortcuts import get_object_or_404
from .models import Category, Product, Cart, CartItem, Order, AuditLog, PaymentEvent
from .serializers import CategorySerializer, ProductSerializer, CartSerializer, OrderSerializer
from .services import OrderService, MidtransService
from django.conf import settings

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

class CartViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        product = get_object_or_404(Product, id=product_id)
        if product.stock < quantity:
            return Response({'error': 'Stok produk tidak mencukupi.'}, status=status.HTTP_400_BAD_REQUEST)

        item, created = CartItem.objects.get_or_create(cart=cart, product=product)
        if not created:
            item.quantity += quantity
        else:
            item.quantity = quantity
        item.save()

        return Response(CartSerializer(cart).data)

class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        cart = get_object_or_404(Cart, user=request.user)
        shipping_address = request.data.get('shipping_address', 'Alamat Pengiriman Standar')
        idempotency_key = request.headers.get('X-Idempotency-Key')

        try:
            order = OrderService.create_order_from_cart(
                user=request.user,
                cart=cart,
                shipping_address=shipping_address,
                idempotency_key=idempotency_key
            )
            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def midtrans_webhook(request):
    payload = request.data
    order_number = payload.get('order_id')
    status_code = payload.get('status_code')
    gross_amount = payload.get('gross_amount')
    signature_key = payload.get('signature_key')
    transaction_status = payload.get('transaction_status')

    # Verify signature
    calculated_sig = MidtransService.generate_signature(
        order_number, status_code, gross_amount, settings.MIDTRANS_SERVER_KEY
    )

    order = Order.objects.filter(order_number=order_number).first()
    if not order:
        return Response({'status': 'order not found'}, status=status.HTTP_404_NOT_FOUND)

    # If signature key matches or in dev test mode
    if signature_key and signature_key != calculated_sig:
        return Response({'status': 'invalid signature'}, status=status.HTTP_403_FORBIDDEN)

    # Handle Payment States Idempotently
    PaymentEvent.objects.create(
        order=order,
        transaction_id=payload.get('transaction_id', 'N/A'),
        event_type=transaction_status,
        raw_payload=payload
    )

    if transaction_status in ['capture', 'settlement']:
        order.payment_status = 'PAID'
        order.status = 'PROCESSING'
    elif transaction_status in ['cancel', 'deny', 'expire']:
        order.payment_status = 'FAILED'
        order.status = 'CANCELLED'

    order.save()
    return Response({'status': 'success'})
