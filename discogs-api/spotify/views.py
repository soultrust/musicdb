from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json
import requests
import base64
from django.conf import settings

from .client import search_track


@method_decorator(csrf_exempt, name='dispatch')
class MatchTracksAPIView(View):
    """
    POST /api/spotify/match-tracks/ — match Discogs tracks to Spotify tracks.
    
    Body: {
        "tracks": [
            {"title": "Song Name", "artists": ["Artist Name"]},
            ...
        ]
    }
    
    Returns: {
        "matches": [
            {
                "discogs_title": "Song Name",
                "spotify_track": {id, name, artists, uri, preview_url, ...} or null
            },
            ...
        ]
    }
    """
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            tracks = data.get("tracks", [])
            
            if not tracks:
                return JsonResponse(
                    {"error": "Missing 'tracks' array in request body"},
                    status=400,
                )
            
            matches = []
            for track in tracks:
                title = track.get("title", "").strip()
                artists = track.get("artists", [])
                artist = artists[0] if artists else None
                
                if not title:
                    matches.append({
                        "discogs_title": title or "Unknown",
                        "spotify_track": None,
                    })
                    continue
                
                try:
                    # Search Spotify for this track
                    spotify_results = search_track(query=title, artist=artist, limit=1)
                    spotify_track = spotify_results[0] if spotify_results else None
                    
                    matches.append({
                        "discogs_title": title,
                        "spotify_track": spotify_track,
                    })
                except Exception as e:
                    # If search fails, return null for this track
                    matches.append({
                        "discogs_title": title,
                        "spotify_track": None,
                        "error": str(e),
                    })
            
            return JsonResponse({"matches": matches})
            
        except json.JSONDecodeError:
            return JsonResponse(
                {"error": "Invalid JSON in request body"},
                status=400,
            )
        except Exception as e:
            return JsonResponse(
                {"error": str(e)},
                status=500,
            )


@method_decorator(csrf_exempt, name='dispatch')
class SpotifyCallbackAPIView(View):
    """
    GET /api/spotify/callback/?code=... — exchange authorization code for access token.
    """
    
    def get(self, request):
        code = request.GET.get("code")
        if not code:
            return JsonResponse(
                {"error": "Missing authorization code"},
                status=400,
            )
        
        client_id = getattr(settings, "SPOTIFY_CLIENT_ID", None)
        client_secret = getattr(settings, "SPOTIFY_CLIENT_SECRET", None)
        redirect_uri = request.GET.get("redirect_uri", "http://127.0.0.1:3000")
        
        if not client_id or not client_secret:
            return JsonResponse(
                {"error": "Spotify credentials not configured"},
                status=503,
            )
        
        # Exchange code for token
        credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        
        response = requests.post(
            "https://accounts.spotify.com/api/token",
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
            },
        )
        
        if response.status_code != 200:
            return JsonResponse(
                {"error": f"Token exchange failed: {response.status_code}", "details": response.text},
                status=502,
            )
        
        data = response.json()
        return JsonResponse({
            "access_token": data.get("access_token"),
            "expires_in": data.get("expires_in"),
        })
