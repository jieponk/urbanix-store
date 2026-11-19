from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import extras_api, articles_api, checkout_views, reviews_api, seller_content
from .views import CartViewSet, CategoryViewSet, OrderViewSet, ProductViewSet
from . import videos

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='orders')

urlpatterns = [
    path('', include(router.urls)),
    path('store-settings/', checkout_views.store_settings, name='store_settings'),
    path('reviews/', checkout_views.review_list, name='review_list'),
    path('products/<int:product_id>/reviews/', reviews_api.product_reviews, name='product_reviews'),
    path('products/<int:product_id>/lengkapi/', extras_api.product_extras, name='product_extras'),
    path('order-reviews/<str:token>/', reviews_api.order_review, name='order_review'),
    path('seller/product-reviews/', reviews_api.seller_reviews, name='seller_product_reviews'),
    path('seller/product-reviews/<int:pk>/', reviews_api.seller_review_detail, name='seller_product_review_detail'),
    path('seller/', include('store.seller_urls')),
    path('banners/', seller_content.public_banners, name='public_banners'),
    path('videos/', videos.public_videos, name='public_videos'),
    path('articles/', articles_api.article_list, name='article_list'),
    path('article-categories/', articles_api.article_categories, name='article_categories'),
    path('articles/<slug:slug>/', articles_api.article_detail, name='article_detail'),
    path('articles/<slug:slug>/comments/', articles_api.article_comments, name='article_comment'),
    path('article-comments/<int:pk>/react/', articles_api.comment_react, name='comment_react'),
    path('news/<int:pk>/comments/', articles_api.news_comments, name='news_comments'),
    path('gifs/', articles_api.gif_search, name='gif_search'),
    path('news/', checkout_views.news_list, name='news_list'),
    path('news/<int:pk>/', checkout_views.news_detail, name='news_detail'),
    path('vouchers/', checkout_views.voucher_list, name='voucher_list'),
    path('checkout/quote/', checkout_views.checkout_quote, name='checkout_quote'),
    path('checkout/', checkout_views.checkout, name='checkout'),
    path('checkout/orders/<str:order_number>/', checkout_views.order_detail, name='checkout_order_detail'),
    path('payments/midtrans-webhook/', checkout_views.midtrans_webhook, name='midtrans_webhook'),
]
