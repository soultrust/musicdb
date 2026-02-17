# Deployment Guide: Render.com & Railway + Neon PostgreSQL

This guide will help you deploy your music database app to either Render.com or Railway with Neon PostgreSQL.

## Prerequisites

- A GitHub account (or GitLab/Bitbucket)
- A Render.com account OR Railway account (or both!)
- A Neon account (free tier works great)

## Step 1: Set Up Neon PostgreSQL Database

1. Go to [neon.tech](https://neon.tech) and sign up/login
2. Create a new project (e.g., "soultrust-musicdb")
3. Copy the connection string - it will look like:
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Keep this connection string handy for Step 3

## Step 2: Push Code to GitHub

Make sure your code is pushed to a GitHub repository:

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

## Step 3: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will detect `render.yaml` and create the service automatically
5. You'll need to set environment variables (see below)

### Option B: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `soultrust-musicdb-api`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r discogs-api/requirements.txt && cd discogs-api && python manage.py collectstatic --noinput`
   - **Start Command**: `cd discogs-api && python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
   - **Root Directory**: Leave empty (or set to `discogs-api` if you prefer)

## Step 4: Configure Environment Variables

In Render dashboard, go to your service → Environment → Add the following:

### Required Variables:

- `SECRET_KEY`: Generate a new Django secret key (use `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
- `DATABASE_URL`: Your Neon connection string from Step 1
- `DEBUG`: `False`
- `ALLOWED_HOSTS`: Your Render URL (e.g., `soultrust-musicdb-api.onrender.com`) - **Update this after first deployment**
- `DISCOGS_USER_AGENT`: Your Discogs app name (e.g., `MyMusicApp/1.0`)

### Optional Variables:

- `DISCOGS_TOKEN`: Your Discogs API token (if you have one)
- `GEMINI_API_KEY`: Your Google Gemini API key (for AI overviews)
- `SPOTIFY_CLIENT_ID`: Your Spotify client ID
- `SPOTIFY_CLIENT_SECRET`: Your Spotify client secret
- `CORS_ALLOW_ALL_ORIGINS`: `False` (for production)
- `CORS_ALLOWED_ORIGINS`: Your frontend URL (e.g., `https://soultrust-musicdb.onrender.com`)

## Step 5: Database Migrations (No Shell Required)

Migrations run automatically every time the service starts. The start command runs `python manage.py migrate --noinput` before starting Gunicorn, so new migrations are applied on each deploy and when the service wakes from sleep. You don’t need (or need to pay for) the Shell.

## Step 6: Create Superuser (Optional)

If you want to use Django admin:

```bash
cd discogs-api
python manage.py createsuperuser
```

## Step 7: Update ALLOWED_HOSTS

After deployment, Render will give you a URL like `https://soultrust-musicdb-api.onrender.com`. Update the `ALLOWED_HOSTS` environment variable in Render with this exact URL.

## Step 8: Deploy Frontend (If Applicable)

If you have a frontend:

1. Create a new Static Site service in Render
2. Point it to your `frontend` directory
3. Set build command: `npm install && npm run build`
4. Set publish directory: `dist` (or wherever Vite outputs)
5. Update `CORS_ALLOWED_ORIGINS` in your API service with the frontend URL

## Troubleshooting

### Database Connection Issues

- Make sure `DATABASE_URL` is set correctly
- Check that Neon allows connections from Render's IPs (usually enabled by default)
- Verify SSL mode is set in connection string (`?sslmode=require`)

### Static Files Not Loading

- Ensure `collectstatic` runs in build command
- Check `STATIC_ROOT` is set correctly in settings.py

### CORS Errors

- Update `CORS_ALLOWED_ORIGINS` with your frontend URL
- Set `CORS_ALLOW_ALL_ORIGINS=False` in production

### Build Failures

- Check Render build logs for specific errors
- Ensure all dependencies are in `requirements.txt`
- Verify Python version matches (3.11.0)

## Cost Estimate

- **Render Free Tier**: Free (with limitations - sleeps after 15 min inactivity)
- **Render Starter**: $7/month (always-on)
- **Neon Free Tier**: Free (up to 0.5 GB storage, 1 project)

For production use, consider Render Starter ($7/month) to avoid cold starts.

---

## Alternative: Deploy to Railway + Neon PostgreSQL

Railway offers a free trial with $5 credits, then $1/month free credits. It's great for comparing with Render!

### Step 1: Set Up Neon PostgreSQL Database

(Same as above - use Neon for both platforms)

### Step 2: Push Code to GitHub

(Same as above)

### Step 3: Deploy to Railway

1. Go to [Railway Dashboard](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub repository
5. Railway will auto-detect Django and use `railway.json` configuration
6. Set environment variables (see below)

### Step 4: Configure Environment Variables

In Railway dashboard, go to your service → Variables → Add:

**Required Variables:**
- `SECRET_KEY`: Generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- `DATABASE_URL`: Your Neon connection string from Step 1
- `DEBUG`: `False`
- `ALLOWED_HOSTS`: Your Railway URL (e.g., `soultrust-musicdb-production.up.railway.app`) - **Update after first deployment**
- `DISCOGS_USER_AGENT`: Your Discogs app name (e.g., `SoulTrustMusicDB/1.0`)

**Optional Variables:**
- `DISCOGS_TOKEN`: Your Discogs API token (if you have one)
- `GEMINI_API_KEY`: Your Google Gemini API key (for AI overviews)
- `SPOTIFY_CLIENT_ID`: Your Spotify client ID
- `SPOTIFY_CLIENT_SECRET`: Your Spotify client secret
- `CORS_ALLOW_ALL_ORIGINS`: `False` (for production)
- `CORS_ALLOWED_ORIGINS`: Your frontend URL

### Step 5: Run Database Migrations

**Option A: Using Railway CLI (Recommended)**
1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Link project: `railway link` (from your repo root)
4. Run migrations:
   ```bash
   cd discogs-api && railway run python manage.py migrate
   ```
   (Or from repo root: `railway run bash -c "cd discogs-api && python manage.py migrate"`)

**Option B: Using Railway Dashboard**
1. In Railway dashboard, go to your service
2. Open a shell (if your plan includes it) or trigger a deploy that runs migrate (see below)

### Step 6: Create Superuser (Optional)

```bash
railway run python discogs-api/manage.py createsuperuser
```

### Step 7: Update ALLOWED_HOSTS

After deployment, Railway will give you a URL like `https://soultrust-musicdb-production.up.railway.app`. Update the `ALLOWED_HOSTS` environment variable in Railway with this exact URL.

### Railway vs Render Comparison

| Feature | Railway | Render |
|---------|---------|--------|
| Free Tier | $5 trial, then $1/month credits | 750 hours/month |
| Cold Start | ~10-30 seconds | ~30-60 seconds |
| Sleep Timeout | 10 minutes | 15 minutes |
| Always-On | Hobby: $5/month | Starter: $7/month |
| Ease of Use | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Auto-Detection | Excellent (Django, Node, etc.) | Good (needs config) |

### Railway Troubleshooting

**Database Connection Issues:**
- Ensure `DATABASE_URL` is set correctly
- Neon allows connections from Railway by default
- Verify SSL mode in connection string (`?sslmode=require`)

**Static Files:**
- Railway auto-runs `collectstatic` if configured in `railway.json`
- Check `STATIC_ROOT` in settings.py

**Service Sleeping:**
- Free tier services sleep after 10 min inactivity
- Upgrade to Hobby ($5/month) to disable sleep
- Or keep service awake with periodic requests

**Build Failures:**
- Check Railway build logs in dashboard
- Ensure all dependencies in `requirements.txt`
- Railway auto-detects Python version, but you can specify in `runtime.txt` if needed

**Railway CLI Issues:**
- Make sure you're logged in: `railway login`
- Link to correct project: `railway link`
- Check you're in the right directory

## Cost Comparison

### Free Tier
- **Render**: 750 hours/month (shared across services)
- **Railway**: $5 trial credits, then $1/month credits

### Always-On Plans
- **Render Starter**: $7/month
- **Railway Hobby**: $5/month

Both platforms work excellently with Neon PostgreSQL!

## Next Steps

1. Set up monitoring (both platforms provide logs)
2. Configure custom domain (optional)
3. Set up automated backups for Neon database
4. Compare performance and choose your preferred platform
5. Consider upgrading to always-on plan when ready for production
