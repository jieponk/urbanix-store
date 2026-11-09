from django.db import migrations, models


def update_default_vouchers(apps, schema_editor):
    """WAHEMAT5 tetap berlaku untuk produk promo; gratis ongkir tanpa minimal belanja; voucher bebas digabung."""
    Voucher = apps.get_model("store", "Voucher")
    StoreSettings = apps.get_model("store", "StoreSettings")
    Voucher.objects.filter(code="WAHEMAT5").update(exclude_promo=False)
    Voucher.objects.filter(code="ONGKIR40").update(min_purchase=0)
    StoreSettings.objects.update(voucher_combo_min_purchase=0)


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0009_vouchers"),
    ]

    operations = [
        migrations.AlterField(
            model_name="storesettings",
            name="voucher_combo_min_purchase",
            field=models.DecimalField(
                decimal_places=0,
                default=0,
                help_text="Voucher diskon + voucher gratis ongkir hanya bisa dipakai bersamaan mulai nilai belanja ini. 0 = selalu bisa digabung.",
                max_digits=12,
                verbose_name="Min. belanja untuk menggabung 2 voucher (Rp)",
            ),
        ),
        migrations.RunPython(update_default_vouchers, migrations.RunPython.noop),
    ]
