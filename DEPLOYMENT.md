# Deployment Guide: Render.com + Neon PostgreSQL

This guide will help you deploy your music database app to Render.com with Neon PostgreSQL.

## Prerequisites

- A GitHub account (or GitLab/Bitbucket)
- A Render.com account
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
   - **Start Command**: `cd discogs-api && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
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

## Step 5: Run Database Migrations

After your first deployment, run migrations:

1. In Render dashboard, go to your service
2. Click "Shell" tab
3. Run:
   ```bash
   cd discogs-api
   python manage.py migrate
   ```

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

## Next Steps

1. Set up monitoring (Render provides basic logs)
2. Configure custom domain (optional)
3. Set up automated backups for Neon database
4. Consider upgrading to Render Starter plan for always-on service
