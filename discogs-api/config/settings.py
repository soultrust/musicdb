# config/settings.py
import os
import environ
from pathlib import Path
from dotenv import load_dotenv 


# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(os.path.join(BASE_DIR, '.env'))

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
environ.Env.read_env(BASE_DIR / '.env')

# Now use env variables instead of hardcoded values
SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')

ALLOWED_HOSTS = ['localhost', '127.0.0.1']

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

# Allow frontend to talk to us (Vite default port)
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
]

CORS_ALLOW_ALL_ORIGINS = True

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
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
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Static files
STATIC_URL = 'static/'

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
