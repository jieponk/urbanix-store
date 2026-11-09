from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import checkout_views
from .views import CartViewSet, CategoryViewSet, OrderViewSet, ProductViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='orders')

urlpatterns = [
    path('', include(router.urls)),
    path('store-settings/', checkout_views.store_settings, name='store_settings'),
    path('reviews/', checkout_views.review_list, name='review_list'),
    path('news/', checkout_views.news_list, name='news_list'),
    path('vouchers/', checkout_views.voucher_list, name='voucher_list'),
    path('checkout/quote/', checkout_views.checkout_quote, name='checkout_quote'),
    path('checkout/', checkout_views.checkout, name='checkout'),
    path('checkout/orders/<str:order_number>/', checkout_views.order_detail, name='checkout_order_detail'),
    path('payments/midtrans-webhook/', checkout_views.midtrans_webhook, name='midtrans_webhook'),
]
