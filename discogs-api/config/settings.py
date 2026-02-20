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

# Add Railway frontend URL if provided via environment variable
frontend_url = os.getenv('FRONTEND_URL') or os.getenv('VITE_API_BASE_URL')
if frontend_url:
    # Extract origin from URL (remove path, query, etc.)
    from urllib.parse import urlparse
    parsed = urlparse(frontend_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if origin not in default_cors_origins:
        default_cors_origins.append(origin)

# Also check if Railway provides a frontend domain
railway_frontend_domain = os.getenv('RAILWAY_STATIC_URL')
if railway_frontend_domain:
    # Ensure it has a scheme
    if not railway_frontend_domain.startswith('http'):
        railway_frontend_domain = f"https://{railway_frontend_domain}"
    if railway_frontend_domain not in default_cors_origins:
        default_cors_origins.append(railway_frontend_domain)

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
