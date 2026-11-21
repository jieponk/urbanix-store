import io

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from PIL import Image

from store.models import Article, Banner
from store.tests.test_seller import SellerTestBase


def img_bytes(fmt="PNG", size=(40, 30), mode="RGB", frames=1):
    buf = io.BytesIO()
    if frames > 1:
        imgs = [Image.new("RGB", size, (i * 40, 0, 0)) for i in range(frames)]
        imgs[0].save(buf, fmt, save_all=True, append_images=imgs[1:], duration=100, loop=0)
    else:
        Image.new(mode, size, (255, 91, 20) if mode == "RGB" else (255, 91, 20, 128)).save(buf, fmt)
    return buf.getvalue()


def is_webp(path):
    with default_storage.open(path, "rb") as f:
        return Image.open(f).format == "WEBP"


class WebpUploadTests(SellerTestBase):
    def test_banner_jpg_and_png_become_webp(self):
        r = self.api.post("/api/v1/seller/banners/", {
            "title": "Promo",
            "image": SimpleUploadedFile("promo.jpg", img_bytes("JPEG"), content_type="image/jpeg"),
            "mobile_image": SimpleUploadedFile("promo-hp.png", img_bytes("PNG", mode="RGBA"), content_type="image/png"),
        }, format="multipart")
        self.assertEqual(r.status_code, 201, r.content)
        b = Banner.objects.get(pk=r.data["id"])
        self.assertTrue(b.image.name.endswith(".webp"))
        self.assertTrue(b.mobile_image.name.endswith(".webp"))
        self.assertTrue(is_webp(b.image.name))
        with default_storage.open(b.mobile_image.name, "rb") as f:
            self.assertEqual(Image.open(f).mode, "RGBA")  # transparansi PNG tetap ada

    def test_big_photo_resized_and_gif_stays_animated(self):
        r = self.api.post("/api/v1/seller/articles/", {
            "title": "Besar",
            "cover": SimpleUploadedFile("besar.jpg", img_bytes("JPEG", size=(4000, 2000)), content_type="image/jpeg"),
        }, format="multipart")
        self.assertEqual(r.status_code, 201, r.content)
        with default_storage.open(Article.objects.get(pk=r.data["id"]).cover.name, "rb") as f:
            self.assertEqual(Image.open(f).size, (1600, 800))
        g = self.api.post("/api/v1/seller/articles/image/", {
            "image": SimpleUploadedFile("anim.gif", img_bytes("GIF", frames=3), content_type="image/gif"),
        }, format="multipart")
        self.assertEqual(g.status_code, 201, g.content)
        self.assertTrue(g.data["url"].endswith(".webp"))
        with default_storage.open(g.data["url"].replace("/media/", "", 1), "rb") as f:
            self.assertEqual(getattr(Image.open(f), "n_frames", 1), 3)

    def test_fake_image_rejected(self):
        r = self.api.post("/api/v1/seller/articles/image/", {
            "image": SimpleUploadedFile("virus.png", b"bukan gambar", content_type="image/png"),
        }, format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_convert_existing_uploads(self):
        b = Banner.objects.create(title="Lama", image=ContentFile(img_bytes("PNG"), name="lama.png"))
        old_body = default_storage.save("articles/body/202611/foto.jpg", ContentFile(img_bytes("JPEG")))
        url = default_storage.url(old_body)
        art = Article.objects.create(title="A", slug="a-lama", body=f"Halo\n\n![foto]({url})",
                                     cover=ContentFile(img_bytes("PNG"), name="sampul.png"))
        call_command("konversi_webp", "--coba", stdout=io.StringIO())
        b.refresh_from_db()
        self.assertTrue(b.image.name.endswith(".png"))  # --coba tidak mengubah apa pun

        call_command("konversi_webp", stdout=io.StringIO())
        b.refresh_from_db()
        art.refresh_from_db()
        self.assertTrue(b.image.name.endswith(".webp") and is_webp(b.image.name))
        self.assertTrue(art.cover.name.endswith(".webp"))
        self.assertNotIn(".jpg", art.body)
        self.assertIn(".webp", art.body)
        self.assertFalse(default_storage.exists(old_body))
