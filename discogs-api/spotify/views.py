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
        import json
        logger = logging.getLogger(__name__)
        
        # #region agent log
        log_path = "/Users/soultrust/dev/SOULTRUST PROJECTS/music/soultrust-musicdb/.cursor/debug-48f4bd.log"
        try:
            with open(log_path, "a") as f:
                f.write(json.dumps({"sessionId":"48f4bd","location":"spotify/views.py:81","message":"Spotify callback endpoint called","data":{"hasCode":bool(request.GET.get("code")),"redirectUri":request.GET.get("redirect_uri"),"requestOrigin":request.headers.get("Origin"),"referer":request.headers.get("Referer")},"timestamp":int(__import__("time").time()*1000),"runId":"run1","hypothesisId":"E"}) + "\n")
        except: pass
        # #endregion
        
        code = request.GET.get("code")
        if not code:
            # #region agent log
            try:
                with open(log_path, "a") as f:
                    f.write(json.dumps({"sessionId":"48f4bd","location":"spotify/views.py:86","message":"Missing authorization code","data":{},"timestamp":int(__import__("time").time()*1000),"runId":"run1","hypothesisId":"E"}) + "\n")
            except: pass
            # #endregion
            return JsonResponse(
                {"error": "Missing authorization code"},
                status=400,
            )
        
        client_id = getattr(settings, "SPOTIFY_CLIENT_ID", None)
        client_secret = getattr(settings, "SPOTIFY_CLIENT_SECRET", None)
        redirect_uri = request.GET.get("redirect_uri", "http://127.0.0.1:3000")
        
        # #region agent log
        try:
            with open(log_path, "a") as f:
                f.write(json.dumps({"sessionId":"48f4bd","location":"spotify/views.py:95","message":"Preparing token exchange","data":{"hasClientId":bool(client_id),"hasClientSecret":bool(client_secret),"redirectUri":redirect_uri,"codePrefix":code[:20]+"..."},"timestamp":int(__import__("time").time()*1000),"runId":"run1","hypothesisId":"E"}) + "\n")
        except: pass
        # #endregion
        
        if not client_id or not client_secret:
            logger.error("Spotify credentials not configured")
            # #region agent log
            try:
                with open(log_path, "a") as f:
                    f.write(json.dumps({"sessionId":"48f4bd","location":"spotify/views.py:99","message":"Spotify credentials missing","data":{},"timestamp":int(__import__("time").time()*1000),"runId":"run1","hypothesisId":"E"}) + "\n")
            except: pass
            # #endregion
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
            
            # #region agent log
            try:
                with open(log_path, "a") as f:
                    f.write(json.dumps({"sessionId":"48f4bd","location":"spotify/views.py:120","message":"Spotify API token exchange response","data":{"statusCode":response.status_code,"hasAccessToken":bool(response.json().get("access_token") if response.status_code==200 else False),"error":response.text[:200] if response.status_code!=200 else None},"timestamp":int(__import__("time").time()*1000),"runId":"run1","hypothesisId":"E"}) + "\n")
            except: pass
            # #endregion
            
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
                # #region agent log
                try:
                    with open(log_path, "a") as f:
                        f.write(json.dumps({"sessionId":"48f4bd","location":"spotify/views.py:131","message":"No access_token in Spotify response","data":{"responseData":data},"timestamp":int(__import__("time").time()*1000),"runId":"run1","hypothesisId":"E"}) + "\n")
                except: pass
                # #endregion
            
            # #region agent log
            try:
                with open(log_path, "a") as f:
                    f.write(json.dumps({"sessionId":"48f4bd","location":"spotify/views.py:133","message":"Token exchange successful, returning token","data":{"hasAccessToken":bool(access_token)},"timestamp":int(__import__("time").time()*1000),"runId":"run1","hypothesisId":"E"}) + "\n")
            except: pass
            # #endregion
            
            return JsonResponse({
                "access_token": access_token,
                "expires_in": data.get("expires_in"),
            })
        except requests.exceptions.RequestException as e:
            logger.error(f"Spotify token exchange request failed: {e}")
            # #region agent log
            try:
                with open(log_path, "a") as f:
                    f.write(json.dumps({"sessionId":"48f4bd","location":"spotify/views.py:138","message":"Token exchange request exception","data":{"error":str(e)},"timestamp":int(__import__("time").time()*1000),"runId":"run1","hypothesisId":"E"}) + "\n")
            except: pass
            # #endregion
            return JsonResponse(
                {"error": f"Request failed: {str(e)}"},
                status=502,
            )


@method_decorator(csrf_exempt, name='dispatch')
class SpotifyPlaylistsView(APIView):
    """
    GET /api/spotify/playlists/ — get user's Spotify playlists (including shared/collaborative).
    Requires Spotify access token in Authorization header.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Fetch user's playlists from Spotify API."""
        spotify_token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
        if not spotify_token:
            return Response(
                {"error": "Missing Spotify access token in Authorization header"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Fetch playlists from Spotify API
            playlists = []
            url = "https://api.spotify.com/v1/me/playlists"
            
            while url:
                response = requests.get(
                    url,
                    headers={"Authorization": f"Bearer {spotify_token}"},
                    timeout=10,
                )
                
                if response.status_code != 200:
                    return Response(
                        {"error": f"Spotify API error: {response.status_code}", "details": response.text},
                        status=status.HTTP_502_BAD_GATEWAY,
                    )
                
                data = response.json()
                for playlist in data.get("items", []):
                    playlists.append({
                        "id": playlist.get("id"),
                        "name": playlist.get("name"),
                        "owner": playlist.get("owner", {}).get("display_name") or playlist.get("owner", {}).get("id"),
                        "collaborative": playlist.get("collaborative", False),
                        "public": playlist.get("public", False),
                        "tracks_count": playlist.get("tracks", {}).get("total", 0),
                        "images": playlist.get("images", []),
                    })
                
                url = data.get("next")  # Pagination
            
            return Response({"playlists": playlists})
            
        except requests.exceptions.RequestException as e:
            return Response(
                {"error": f"Failed to fetch playlists: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )


@method_decorator(csrf_exempt, name='dispatch')
class SpotifyPlaylistTracksView(APIView):
    """
    GET /api/spotify/playlists/<playlist_id>/tracks/ — get tracks for a Spotify playlist.
    Requires Spotify access token in Authorization header.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, playlist_id):
        """Fetch tracks for a specific playlist from Spotify API."""
        spotify_token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
        if not spotify_token:
            return Response(
                {"error": "Missing Spotify access token in Authorization header"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # First get playlist info
            playlist_response = requests.get(
                f"https://api.spotify.com/v1/playlists/{playlist_id}",
                headers={"Authorization": f"Bearer {spotify_token}"},
                timeout=10,
            )
            
            if playlist_response.status_code != 200:
                return Response(
                    {"error": f"Spotify API error: {playlist_response.status_code}", "details": playlist_response.text},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            
            playlist_data = playlist_response.json()
            
            # Fetch tracks
            tracks = []
            url = f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks"
            
            while url:
                response = requests.get(
                    url,
                    headers={"Authorization": f"Bearer {spotify_token}"},
                    params={"fields": "items(track(id,name,artists,album,uri,duration_ms,preview_url))"},
                    timeout=10,
                )
                
                if response.status_code != 200:
                    return Response(
                        {"error": f"Spotify API error: {response.status_code}", "details": response.text},
                        status=status.HTTP_502_BAD_GATEWAY,
                    )
                
                data = response.json()
                for item in data.get("items", []):
                    track = item.get("track")
                    if track and track.get("id"):  # Skip null tracks (removed tracks)
                        tracks.append({
                            "id": track.get("id"),
                            "name": track.get("name"),
                            "artists": [{"name": artist.get("name")} for artist in track.get("artists", [])],
                            "album": track.get("album", {}).get("name"),
                            "uri": track.get("uri"),
                            "duration_ms": track.get("duration_ms"),
                            "preview_url": track.get("preview_url"),
                        })
                
                url = data.get("next")  # Pagination
            
            return Response({
                "id": playlist_data.get("id"),
                "name": playlist_data.get("name"),
                "owner": playlist_data.get("owner", {}).get("display_name") or playlist_data.get("owner", {}).get("id"),
                "description": playlist_data.get("description"),
                "images": playlist_data.get("images", []),
                "tracks": tracks,
            })
            
        except requests.exceptions.RequestException as e:
            return Response(
                {"error": f"Failed to fetch playlist tracks: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
