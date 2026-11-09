from django.urls import path

from . import seller_api as a
from . import seller_content as c

urlpatterns = [
    path("login/", a.login),
    path("me/", a.me),
    path("logout/", a.logout),
    path("dashboard/", a.dashboard),
    path("orders/", a.orders),
    path("orders/export/", a.orders_export),
    path("orders/<str:number>/", a.order_detail),
    path("orders/<str:number>/stock/", a.order_stock),
    path("products/", a.products),
    path("products/bulk/", a.products_bulk),
    path("products/template/", a.products_template),
    path("products/import/", a.products_import),
    path("products/<int:pk>/", a.product_detail),
    path("variations/<int:pk>/", a.variation_detail),
    path("promos/", c.promos),
    path("promos/<int:pk>/", c.promo_detail),
    path("promos/<int:pk>/items/", c.promo_items),
    path("promo-items/<int:item_id>/", c.promo_item_delete),
    path("vouchers/", c.vouchers),
    path("vouchers/<int:pk>/", c.voucher_detail),
    path("banners/", c.banners),
    path("banners/<int:pk>/", c.banner_detail),
    path("news/", c.news_articles),
    path("news/fetch/", c.news_fetch),
    path("news/<int:pk>/", c.news_article_detail),
    path("news-sources/<int:pk>/", c.news_source_detail),
    path("reviews/", c.reviews),
    path("reviews/<int:pk>/", c.review_detail),
    path("categories/", c.categories),
    path("categories/<int:pk>/", c.category_detail),
    path("settings/", c.store_settings),
]
