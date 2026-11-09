from django.test import TestCase
from rest_framework.test import APIClient

from store.models import Category, Product, Review, StoreSettings


class ReviewTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        cat = Category.objects.create(name="Kamera", slug="kamera")
        self.p = Product.objects.create(category=cat, name="Kamera", slug="k", sku="K",
                                        description="-", price=1, stock=1)

    def test_list_masks_names_and_hides_unpublished(self):
        Review.objects.create(customer_name="budiman", rating=5, text="Mantap", product=self.p)
        Review.objects.create(customer_name="sari", rating=4, text="Ok", is_published=False)
        data = self.api.get("/api/v1/reviews/").data
        self.assertEqual(len(data), 1)
        self.assertEqual((data[0]["name"], data[0]["product_name"]), ("b***n", "Kamera"))
        self.assertEqual(len(self.api.get(f"/api/v1/reviews/?product={self.p.id + 1}").data), 0)
        self.assertEqual(self.api.get("/api/v1/store-settings/").data["review_count"], 1)


class WhatsappNumberTests(TestCase):
    def test_number_normalized_on_save(self):
        for raw, expected in [("+62 821-2990-180", "628212990180"), ("0812 3456 7890", "6281234567890"), ("6281234567890", "6281234567890")]:
            s = StoreSettings.load(); s.whatsapp_number = raw; s.save()
            self.assertEqual(StoreSettings.load().whatsapp_number, expected)
