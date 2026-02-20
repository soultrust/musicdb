# config/settings.py
import os
import environ
from pathlib import Path

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY') 
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

# Initialize environ
env = environ.Env(
    DEBUG=(bool, False),
    DISCOGS_USER_AGENT=(str, ""),
    DISCOGS_TOKEN=(str, ""),
    GEMINI_API_KEY=(str, ""),
    SPOTIFY_CLIENT_ID=(str, ""),
    SPOTIFY_CLIENT_SECRET=(str, ""),
)
# Load environment variables from .env file
environ.Env.read_env(BASE_DIR / '.env')

# Now use env variables instead of hardcoded values
# SECRET_KEY is required, but allow a dummy value during build/collectstatic
SECRET_KEY = env('SECRET_KEY', default='dummy-key-for-build-only-replace-in-production')
DEBUG = env('DEBUG')

# Allow Railway domain and localhost for development
# Railway provides RAILWAY_PUBLIC_DOMAIN environment variable
default_allowed_hosts = ['localhost', '127.0.0.1']
railway_domain = os.getenv('RAILWAY_PUBLIC_DOMAIN')
if railway_domain:
    default_allowed_hosts.append(railway_domain)
    # Also add without port if domain includes port
    if ':' in railway_domain:
        default_allowed_hosts.append(railway_domain.split(':')[0])

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=default_allowed_hosts)

# Add our new packages to INSTALLED_APPS
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'corsheaders',

    # Local apps
    'accounts.apps.AccountsConfig',
    'discogs.apps.DiscogsConfig',
    'spotify.apps.SpotifyConfig',
]

# Custom user model (must be before first migrate in a new project)
AUTH_USER_MODEL = 'accounts.CustomUser'

# Add CORS middleware (must be high in the list)
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',       # ← Add this FIRST
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# CORS settings - allow frontend origins
default_cors_origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
]

# Add frontend URL(s) from environment variables
# FRONTEND_URL should be set to your frontend's public URL (custom domain or Railway URL)
from urllib.parse import urlparse

def add_origin_to_list(url, origin_list):
    """Helper to extract origin from URL and add to list if not already present."""
    if not url:
        return
    parsed = urlparse(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if origin not in origin_list:
        origin_list.append(origin)

# Add custom frontend URL (should be your custom domain if you have one)
frontend_url = os.getenv('FRONTEND_URL')
if frontend_url:
    add_origin_to_list(frontend_url, default_cors_origins)

# Also add Railway's public domain if different from FRONTEND_URL
# This handles cases where custom domain points to Railway URL
railway_public_domain = os.getenv('RAILWAY_PUBLIC_DOMAIN')
if railway_public_domain:
    # Railway public domain might not include scheme
    railway_origin = railway_public_domain if railway_public_domain.startswith('http') else f"https://{railway_public_domain}"
    add_origin_to_list(railway_origin, default_cors_origins)

CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=default_cors_origins
)

# In production, set CORS_ALLOW_ALL_ORIGINS=False and configure CORS_ALLOWED_ORIGINS
# Default to False in production (when DEBUG=False or on Railway), True in development
is_railway = bool(os.getenv('RAILWAY_ENVIRONMENT') or os.getenv('RAILWAY_PUBLIC_DOMAIN'))
CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=DEBUG and not is_railway)

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# Simple JWT
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

# Required for Django admin
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

# Database
# Use PostgreSQL if DATABASE_URL is set (production), otherwise SQLite (development)
DATABASES = {
    'default': env.db('DATABASE_URL', default=f'sqlite:///{BASE_DIR / "db.sqlite3"}')
}

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (user uploads - if needed in future)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Discogs API
DISCOGS_USER_AGENT = env("DISCOGS_USER_AGENT")
DISCOGS_TOKEN = env("DISCOGS_TOKEN")
DISCOGS_API_BASE_URL = "https://api.discogs.com"

# Gemini API (optional; for AI overviews)
GEMINI_API_KEY = env("GEMINI_API_KEY")

# Spotify API
SPOTIFY_CLIENT_ID = env("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = env("SPOTIFY_CLIENT_SECRET")

# Auth (for admin)
ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
