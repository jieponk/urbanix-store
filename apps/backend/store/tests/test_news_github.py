import io
import json
from unittest import mock

from django.test import SimpleTestCase


from store import news_ai


class _Resp(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class GithubFallbackTests(SimpleTestCase):
    @mock.patch.dict("os.environ", {"GITHUB_MODELS_TOKEN": "x"})
    def test_plain_ok_reply_falls_back_to_legacy_endpoint(self):
        calls = []

        def fake_urlopen(req, timeout=0):
            calls.append((req.full_url, json.loads(req.data)["model"]))
            if "models.github.ai" in req.full_url:
                return _Resp(b"OK")
            return _Resp(json.dumps({"choices": [{"message": {"content": "halo"}}]}).encode())

        with mock.patch.object(news_ai.urllib.request, "urlopen", fake_urlopen):
            self.assertEqual(news_ai._call_openai_compatible("tes", "github"), "halo")
        self.assertEqual(len(calls), 2)
        self.assertIn("azure.com", calls[1][0])
        self.assertNotIn("/", calls[1][1])  # nama model tanpa awalan "openai/"
