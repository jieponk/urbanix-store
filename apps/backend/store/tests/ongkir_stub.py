"""Bantu tes: aktifkan ongkir otomatis dengan tarif tiruan (tanpa memanggil RajaOngkir)."""
from unittest import mock

from store.models import StoreSettings

ZERO_RATE = {"code": "jne:REG", "courier": "jne", "courier_name": "JNE", "service": "REG",
             "description": "Reguler", "cost": 0, "etd": "2-3"}
AUTO_SHIPPING = {"service": "jne:REG", "destination_id": 17}


def enable_ongkir(testcase, rate=None):
    store = StoreSettings.load()
    store.rajaongkir_origin_id = 1
    store.save()
    patcher = mock.patch("store.ongkir.rates", return_value=[rate or ZERO_RATE])
    testcase.rates_mock = patcher.start()
    testcase.addCleanup(patcher.stop)
