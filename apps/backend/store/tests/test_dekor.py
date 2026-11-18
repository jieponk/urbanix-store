from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient


class DekorTokoTests(TestCase):
    def setUp(self):
        cache.clear()
        User.objects.create_user("admin", password="rahasia123", is_staff=True)
        self.api = APIClient()
        r = self.api.post("/api/v1/seller/login/", {"username": "admin", "password": "rahasia123"}, format="json")
        self.api.credentials(HTTP_AUTHORIZATION=f"Token {r.data['token']}")

    def test_default_auto_in_public_settings(self):
        data = APIClient().get("/api/v1/store-settings/").json()
        self.assertEqual(data["event"], {"mode": "auto", "theme": None, "until": None, "teaser_days": 3})

    def test_force_requires_theme_and_is_public(self):
        r = self.api.patch("/api/v1/seller/settings/", {"event_mode": "force"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.api.patch("/api/v1/seller/settings/", {"event_mode": "force", "event_theme": "gajian",
                                                        "event_until": "2026-11-30T23:59:00+07:00"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        ev = APIClient().get("/api/v1/store-settings/").json()["event"]
        self.assertEqual((ev["mode"], ev["theme"]), ("force", "gajian"))
        self.assertTrue(ev["until"].startswith("2026-11-30"))

    def test_teaser_limit(self):
        r = self.api.patch("/api/v1/seller/settings/", {"event_teaser_days": 30}, format="json")
        self.assertEqual(r.status_code, 400)
