from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import articles_api, checkout_views, seller_content
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
    path('seller/', include('store.seller_urls')),
    path('banners/', seller_content.public_banners, name='public_banners'),
    path('articles/', articles_api.article_list, name='article_list'),
    path('article-categories/', articles_api.article_categories, name='article_categories'),
    path('articles/<slug:slug>/', articles_api.article_detail, name='article_detail'),
    path('articles/<slug:slug>/comments/', articles_api.article_comment, name='article_comment'),
    path('news/', checkout_views.news_list, name='news_list'),
    path('news/<int:pk>/', checkout_views.news_detail, name='news_detail'),
    path('vouchers/', checkout_views.voucher_list, name='voucher_list'),
    path('checkout/quote/', checkout_views.checkout_quote, name='checkout_quote'),
    path('checkout/', checkout_views.checkout, name='checkout'),
    path('checkout/orders/<str:order_number>/', checkout_views.order_detail, name='checkout_order_detail'),
    path('payments/midtrans-webhook/', checkout_views.midtrans_webhook, name='midtrans_webhook'),
]
