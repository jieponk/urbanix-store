import pytest
from django.contrib.auth.models import User
from store.models import Category, Product, Cart, Order
from store.services import OrderService

@pytest.mark.django_db
def test_create_product_and_category():
    cat = Category.objects.create(name="Audio", slug="audio")
    prod = Product.objects.create(
        category=cat, name="Headphone Noise Cancelling", slug="headphone-nc",
        sku="AUDIO-001", description="Premium audio headphone", price=1500000, stock=10
    )
    assert prod.stock == 10
    assert cat.products.count() == 1

@pytest.mark.django_db
def test_prevent_overselling():
    user = User.objects.create_user(username="testuser", password="password")
    cat = Category.objects.create(name="Gaming", slug="gaming")
    prod = Product.objects.create(
        category=cat, name="Console Game", slug="console-game",
        sku="GAME-001", description="Console gaming", price=5000000, stock=2
    )
    cart = Cart.objects.create(user=user)
    cart.items.create(product=prod, quantity=5) # Demanding more than stock (2)

    with pytest.raises(ValueError) as excinfo:
        OrderService.create_order_from_cart(user, cart, "Jakarta")
    
    assert "tidak mencukupi" in str(excinfo.value)
