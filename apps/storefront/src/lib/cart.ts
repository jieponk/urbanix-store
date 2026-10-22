export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  stock: number;
};

const CART_KEY = 'urbanix-cart';

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cart-updated'));
}

export function addToCart(item: CartItem) {
  const cart = getCart();
  const existing = cart.find((p) => p.id === item.id);

  if (existing) {
    if (existing.quantity < item.stock) {
      existing.quantity += item.quantity;
    }
  } else {
    cart.push(item);
  }

  saveCart(cart);
}

export function removeFromCart(id: string) {
  saveCart(getCart().filter((item) => item.id !== id));
}

export function updateCartQuantity(id: string, quantity: number) {
  const cart = getCart().map((item) =>
    item.id === id
      ? { ...item, quantity: Math.min(item.stock, Math.max(1, quantity)) }
      : item
  );

  saveCart(cart);
}