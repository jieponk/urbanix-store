import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_env_file(path):
    """Baca apps/backend/.env (format NAMA=nilai). Variabel yang sudah di-set di sistem tetap diutamakan."""
    if not path.exists():
        return
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env_file(BASE_DIR / '.env')

SECRET_KEY = os.environ.get('SECRET_KEY', 'urbanix-super-secret-key-for-dev')
DEBUG = os.environ.get('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = [h.strip() for h in os.environ.get('ALLOWED_HOSTS', '*').split(',') if h.strip()]

# Produksi (di belakang Caddy/Cloudflare): percaya header HTTPS dari proxy & izinkan login admin lewat domain.
CSRF_TRUSTED_ORIGINS = [o.strip() for o in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',') if o.strip()]
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'drf_spectacular',
    # Internal apps
    'store',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'urbanix_core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'urbanix_core.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql' if os.environ.get('POSTGRES_HOST') else 'django.db.backends.sqlite3',
        'NAME': os.environ.get('POSTGRES_DB', BASE_DIR / 'db.sqlite3'),
        'USER': os.environ.get('POSTGRES_USER', 'urbanix'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'urbanix'),
        'HOST': os.environ.get('POSTGRES_HOST', 'localhost'),
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 12,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_RATES': {
        'checkout_quote': '120/min',
        'checkout': '10/min',
        'seller_login': '10/min',
        'article_comment': '5/min',
    },
}

CORS_ALLOW_ALL_ORIGINS = True

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Jakarta'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = Path(os.environ.get('STATIC_ROOT', BASE_DIR / 'staticfiles'))
MEDIA_URL = '/media/'
MEDIA_ROOT = Path(os.environ.get('MEDIA_ROOT', BASE_DIR / 'media'))
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Midtrans Config
MIDTRANS_SERVER_KEY = os.environ.get('MIDTRANS_SERVER_KEY', 'SB-Mid-server-demo')
MIDTRANS_CLIENT_KEY = os.environ.get('MIDTRANS_CLIENT_KEY', 'SB-Mid-client-demo')
MIDTRANS_IS_PRODUCTION = os.environ.get('MIDTRANS_IS_PRODUCTION', 'False') == 'True'

# Alamat storefront (dipakai untuk tombol "kembali ke toko" setelah bayar di Midtrans).
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Email pesanan ke pembeli (opsional). Kosongkan EMAIL_HOST untuk mematikan.
# Contoh Gmail: EMAIL_HOST=smtp.gmail.com, EMAIL_PORT=587, EMAIL_HOST_USER=urbanixstore26@gmail.com,
# EMAIL_HOST_PASSWORD=<App Password 16 huruf dari akun Google>.
EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587') or 587)
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_TIMEOUT = 15
DEFAULT_FROM_EMAIL = os.environ.get('EMAIL_FROM', '') or (
    f'Urbanix Store <{EMAIL_HOST_USER}>' if EMAIL_HOST_USER else 'Urbanix Store <noreply@urbanix.id>'
)
ORDER_EMAIL_ENABLED = bool(EMAIL_HOST)
ORDER_EMAIL_SYNC = False  # True di tes: kirim langsung, bukan di thread
