from django.http import JsonResponse
from django.views import View
import json

from .client import search_track


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
