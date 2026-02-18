import json
import requests
import base64
from django.conf import settings
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .client import search_track, find_best_match


@method_decorator(csrf_exempt, name='dispatch')
class MatchTracksAPIView(APIView):
    """
    POST /api/spotify/match-tracks/ — match Discogs tracks to Spotify tracks.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            data = request.data
            tracks = data.get("tracks", [])
            
            if not tracks:
                return Response(
                    {"error": "Missing 'tracks' array in request body"},
                    status=status.HTTP_400_BAD_REQUEST,
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
                    # Search Spotify for this track - get multiple results to find best match
                    spotify_results = search_track(query=title, artist=artist, limit=5)
                    # Use best match algorithm instead of just taking first result
                    spotify_track = find_best_match(title, artists, spotify_results)
                    
                    matches.append({
                        "discogs_title": title,
                        "spotify_track": spotify_track,
                    })
                except Exception as e:
                    matches.append({
                        "discogs_title": title,
                        "spotify_track": None,
                        "error": str(e),
                    })
            
            return Response({"matches": matches})
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


@method_decorator(csrf_exempt, name='dispatch')
class SpotifyCallbackAPIView(View):
    """
    GET /api/spotify/callback/?code=... — exchange authorization code for access token.
    """
    
    def get(self, request):
        import logging
        logger = logging.getLogger(__name__)
        
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
            logger.error("Spotify credentials not configured")
            return JsonResponse(
                {"error": "Spotify credentials not configured"},
                status=503,
            )
        
        # Exchange code for token
        credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        
        try:
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
                timeout=10,
            )
            
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"Spotify token exchange failed: {response.status_code}, {error_text}")
                return JsonResponse(
                    {"error": f"Token exchange failed: {response.status_code}", "details": error_text},
                    status=502,
                )
            
            data = response.json()
            access_token = data.get("access_token")
            if not access_token:
                logger.error(f"Spotify: No access_token in response: {data}")
            
            return JsonResponse({
                "access_token": access_token,
                "expires_in": data.get("expires_in"),
            })
        except requests.exceptions.RequestException as e:
            logger.error(f"Spotify token exchange request failed: {e}")
            return JsonResponse(
                {"error": f"Request failed: {str(e)}"},
                status=502,
            )
