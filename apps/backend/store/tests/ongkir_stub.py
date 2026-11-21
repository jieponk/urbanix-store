"""Bantu tes: aktifkan ongkir otomatis dengan tarif tiruan (tanpa memanggil Biteship)."""
from unittest import mock

from store.models import StoreSettings

ZERO_RATE = {"code": "jne:reg", "courier": "jne", "courier_name": "JNE", "service": "Reguler",
             "description": "Layanan reguler", "cost": 0, "etd": "2-3"}
AUTO_SHIPPING = {"service": "jne:reg", "destination_id": "IDNP6IDNC148IDND836IDZ12430"}


def enable_ongkir(testcase, rate=None):
    store = StoreSettings.load()
    store.ongkir_origin_id = "IDNP6IDNC147IDND826IDZ10710"
    store.save()
    patcher = mock.patch("store.ongkir.rates", return_value=[rate or ZERO_RATE])
    testcase.rates_mock = patcher.start()
    testcase.addCleanup(patcher.stop)
