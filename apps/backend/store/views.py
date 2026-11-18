from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Avg, FloatField, IntegerField, OuterRef, Subquery, Sum, Count
from django.db.models.functions import Coalesce
from .models import Category, Product, Cart, CartItem, Order, OrderItem, ProductReview
from .serializers import CategorySerializer, ProductSerializer, CartSerializer, OrderSerializer
from .pricing import prefetch_running_promos
from .services import OrderService

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        Product.objects.filter(is_active=True)
        .select_related('category')
        .prefetch_related('variations', prefetch_running_promos())
        .annotate(
            # Untuk urutan "Terlaris" di katalog: jumlah terjual dari pesanan web (kecuali dibatalkan)
            sold_count=Coalesce(
                Subquery(
                    OrderItem.objects.filter(product=OuterRef('pk'))
                    .exclude(order__status='CANCELLED')
                    .values('product')
                    .annotate(n=Sum('quantity'))
                    .values('n')[:1],
                    output_field=IntegerField(),
                ),
                0,
            ),
            rating_avg=Subquery(
                ProductReview.objects.filter(product=OuterRef('pk'), is_visible=True)
                .values('product')
                .annotate(a=Avg('rating'))
                .values('a')[:1],
                output_field=FloatField(),
            ),
            review_count=Coalesce(
                Subquery(
                    ProductReview.objects.filter(product=OuterRef('pk'), is_visible=True)
                    .values('product')
                    .annotate(n=Count('id'))
                    .values('n')[:1],
                    output_field=IntegerField(),
                ),
                0,
            ),
        )
    )
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

# Webhook Midtrans dipindah ke checkout_views.midtrans_webhook (tanda tangan wajib valid).
