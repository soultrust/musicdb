from django.conf import settings
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import AlbumOverview, ConsumedAlbum, List, ListItem
from .serializers import AlbumOverviewSerializer
from .client import search, get_release, get_master, get_artist, get_label


def _fetch_display_title_from_discogs(resource_type, resource_id):
    """Fetch 'Artist - Album' from Discogs API for a release or master. Returns '' on failure."""
    try:
        if resource_type == "release":
            resp = get_release(int(resource_id))
        elif resource_type == "master":
            resp = get_master(int(resource_id))
        else:
            return ""
        if resp.status_code != 200:
            return ""
        data = resp.json()
        artists = data.get("artists") or []
        album_title = (data.get("title") or "").strip()
        if artists and album_title:
            artist_str = ", ".join(a.get("name", "") for a in artists).strip()
            return f"{artist_str} - {album_title}"
        return album_title
    except Exception:
        return ""


class SearchAPIView(APIView):
    """GET /api/search/?q=...&page=1 — proxy to Discogs search, return JSON. Adds consumed flag per result."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.GET.get("q", "").strip()
        if not q:
            return Response(
                {"error": "Missing query parameter: q"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not getattr(settings, "DISCOGS_USER_AGENT", None):
            return Response(
                {"error": "Discogs is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        page = max(1, int(request.GET.get("page", 1)))
        response = search(q=q, per_page=20, page=page)
        if response.status_code != 200:
            return Response(
                {"error": f"Discogs API returned {response.status_code}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        data = response.json()
        try:
            consumed_ids = set(
                (r["type"].lower(), str(r["discogs_id"]))
                for r in ConsumedAlbum.objects.filter(user=request.user, consumed=True).values("type", "discogs_id")
            )
        except Exception:
            consumed_ids = set()
        if consumed_ids and "results" in data:
            for r in data["results"]:
                t = (r.get("type") or "").lower()
                if t in ("release", "master"):
                    rid = r.get("id")
                    r["consumed"] = (t, str(rid)) in consumed_ids
        return Response(data)


@method_decorator(csrf_exempt, name="dispatch")
class ConsumedAlbumView(APIView):
    """GET/PUT /api/search/consumed/?type=release&id=123 — get or set consumed status."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        resource_type = request.query_params.get("type", "").strip().lower()
        resource_id = request.query_params.get("id", "").strip()
        if not resource_type or not resource_id:
            return Response(
                {"error": "Missing required parameters: type and id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if resource_type not in ("release", "master"):
            return Response(
                {"error": "type must be 'release' or 'master'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        record = ConsumedAlbum.objects.filter(user=request.user, type=resource_type, discogs_id=str(resource_id)).first()
        consumed = record.consumed if record else False
        return Response({"consumed": consumed})

    def _set_consumed(self, request):
        resource_type = request.query_params.get("type", "").strip().lower()
        resource_id = request.query_params.get("id", "").strip()
        if not resource_type or not resource_id:
            return Response(
                {"error": "Missing required parameters: type and id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if resource_type not in ("release", "master"):
            return Response(
                {"error": "type must be 'release' or 'master'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            consumed = request.data.get("consumed", True)
            if not isinstance(consumed, bool):
                consumed = bool(consumed)
            title = (request.data.get("title") or "").strip()
        except Exception:
            consumed = True
            title = ""
        if consumed:
            fetched = _fetch_display_title_from_discogs(resource_type, resource_id)
            if fetched:
                title = fetched
        record, _ = ConsumedAlbum.objects.update_or_create(
            user=request.user,
            type=resource_type,
            discogs_id=str(resource_id),
            defaults={"consumed": consumed, "title": title},
        )
        return Response({"consumed": record.consumed})

    def put(self, request):
        return self._set_consumed(request)

    def post(self, request):
        return self._set_consumed(request)


class ConsumedTitlesView(APIView):
    """GET /api/search/consumed-titles/ — list of titles that have a consumed album (for hiding duplicates)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        titles = list(
            ConsumedAlbum.objects.filter(user=request.user, consumed=True)
            .exclude(title="")
            .values_list("title", flat=True)
            .distinct()
        )
        return Response({"titles": titles})


class ConsumedListView(APIView):
    """GET /api/search/consumed-list/ — full list of consumed albums, shape like search results (type, id, title)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        records = list(
            ConsumedAlbum.objects.filter(user=request.user, consumed=True).values("type", "discogs_id", "title")
        )
        results = []
        for r in records:
            tid = r["discogs_id"]
            id_val = int(tid) if tid.isdigit() else tid
            title = (r["title"] or "").strip()
            if not title:
                title = f"({r['type']} #{tid})"
            results.append({"type": r["type"], "id": id_val, "title": title})
        return Response({"results": results})


class ConsumedBackfillView(APIView):
    """GET /api/search/consumed-backfill/ — fetch 'Artist - Album' from Discogs for consumed records with empty or album-only title."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        updated = 0
        for rec in ConsumedAlbum.objects.filter(user=request.user, consumed=True):
            fetched = _fetch_display_title_from_discogs(rec.type, rec.discogs_id)
            if not fetched:
                continue
            current = (rec.title or "").strip()
            if not current or " - " not in current:
                rec.title = fetched
                rec.save(update_fields=["title"])
                updated += 1
        return Response({"updated": updated})


class DetailAPIView(APIView):
    """GET /api/detail/?type=release&id=123 — get full details for a release/artist/label."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        resource_type = request.GET.get("type", "").strip().lower()
        resource_id = request.GET.get("id", "").strip()
        
        if not resource_type or not resource_id:
            return Response(
                {"error": "Missing required parameters: type and id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if not getattr(settings, "DISCOGS_USER_AGENT", None):
            return Response(
                {"error": "Discogs is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        
        try:
            resource_id = int(resource_id)
        except ValueError:
            return Response(
                {"error": "Invalid id parameter"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if resource_type == "release":
            response = get_release(resource_id)
        elif resource_type == "master":
            response = get_master(resource_id)
        elif resource_type == "artist":
            response = get_artist(resource_id)
        elif resource_type == "label":
            response = get_label(resource_id)
        else:
            return Response(
                {"error": f"Invalid type: {resource_type}. Must be 'release', 'master', 'artist', or 'label'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if response.status_code != 200:
            return Response(
                {"error": f"Discogs API returned {response.status_code}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        
        return Response(response.json())


import re
import logging
import requests

logger = logging.getLogger(__name__)

# Gemini API is now accessed via REST API directly, no SDK needed
GEMINI_AVAILABLE = True  # Always available since we use REST API


class AlbumOverviewView(APIView):
    """
    Fetches a critical overview of an album.
    Priority order: cache, then Gemini (if available), then Wikipedia.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        album = request.query_params.get('album', '').strip()
        artist = request.query_params.get('artist', '').strip()

        # Validate input
        if not album or not artist:
            return Response(
                {"error": "Both 'album' and 'artist' query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Step 1: Check the cache
        cached_overview = AlbumOverview.objects.filter(
            artist__iexact=artist,
            album__iexact=album
        ).first()

        if cached_overview:
            print(f"[DEBUG] Using cached overview for '{album}' by {artist} (source: {cached_overview.source})")
            serializer = AlbumOverviewSerializer(cached_overview)
            return Response({
                "source": "cache",
                "data": serializer.data
            })
        
        print(f"[DEBUG] No cache found for '{album}' by {artist}, fetching new overview...")

        # Step 2: Try Gemini API first (if available and configured)
        # TEMPORARILY DISABLED - Uncomment to re-enable Gemini
        overview_text = None
        source = None
        gemini_error = None
        wikipedia_error = None

        # Temporarily disabled to avoid using up API quota
        # Set to True to re-enable Gemini
        USE_GEMINI = False
        
        if USE_GEMINI and GEMINI_AVAILABLE and getattr(settings, 'GEMINI_API_KEY', None):
            print(f"[DEBUG] Attempting Gemini API call for '{album}' by {artist}")
            try:
                overview_text = self._fetch_from_gemini(artist, album)
                source = "gemini"
                print(f"[DEBUG] ✅ Gemini succeeded for '{album}' by {artist}")
                logger.info(f"Successfully fetched overview from Gemini for '{album}' by {artist}")
            except Exception as e:
                gemini_error = f"{type(e).__name__}: {str(e)}"
                print(f"[DEBUG] ❌ Gemini failed for '{album}' by {artist}: {gemini_error}")
                print(f"[DEBUG] ❌ Full exception: {repr(e)}")
                logger.warning(f"Gemini failed for '{album}' by {artist}: {gemini_error}")
        else:
            if not USE_GEMINI:
                print(f"[DEBUG] Gemini temporarily disabled (USE_GEMINI=False)")
            elif not GEMINI_AVAILABLE:
                print(f"[DEBUG] Gemini not available (library not installed)")
            elif not getattr(settings, 'GEMINI_API_KEY', None):
                print(f"[DEBUG] Gemini API key not configured")

        # Step 3: Fall back to Wikipedia if Gemini didn't work
        if not overview_text:
            print(f"[DEBUG] Falling back to Wikipedia for '{album}' by {artist}")
            try:
                overview_text = self._fetch_from_wikipedia(artist, album)
                source = "wikipedia"
                print(f"[DEBUG] ✅ Wikipedia succeeded for '{album}' by {artist}")
                logger.info(f"Successfully fetched overview from Wikipedia for '{album}' by {artist}")
            except Exception as e:
                wikipedia_error = f"{type(e).__name__}: {str(e)}"
                print(f"[DEBUG] ❌ Wikipedia failed for '{album}' by {artist}: {wikipedia_error}")
                print(f"[DEBUG] ❌ Full exception: {repr(e)}")
                logger.warning(f"Wikipedia failed for '{album}' by {artist}: {wikipedia_error}")

        if not overview_text:
            err_detail = "Unable to fetch album overview."
            if gemini_error:
                err_detail += f" Gemini: {gemini_error[:200]}."
                print(f"[DEBUG] ❌ Final error - Gemini failed: {gemini_error}")
            if wikipedia_error:
                err_detail += f" Wikipedia: {wikipedia_error[:200]}."
                print(f"[DEBUG] ❌ Final error - Wikipedia failed: {wikipedia_error}")
            print(f"[DEBUG] ❌ Returning 503 error: {err_detail}")
            return Response(
                {"error": err_detail},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Step 4: Cache the result in PostgreSQL
        new_overview = AlbumOverview.objects.create(
            artist=artist,
            album=album,
            overview=overview_text,
            source=source
        )

        serializer = AlbumOverviewSerializer(new_overview)
        return Response({
            "source": source,
            "data": serializer.data
        })

    def _fetch_from_gemini(self, artist, album):
        """
        Uses Google's Gemini API to generate a critical overview of an album.
        Uses REST API directly (gemini-2.0-flash works, gemini-1.5-pro doesn't).
        Requires GEMINI_API_KEY to be set in settings.
        """
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key:
            raise Exception("GEMINI_API_KEY not configured")
        
        # Use REST API directly - gemini-2.0-flash works (tested via curl)
        model_name = 'gemini-2.0-flash'
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        
        # Create a prompt for album overview
        prompt = f"""Write a critical overview of the album "{album}" by {artist}. 

Include:
- A brief description of the album's style, genre, and key characteristics
- Notable tracks or highlights
- Critical reception and reviews
- Historical context and significance
- Any awards, chart performance, or cultural impact

Keep it informative, well-structured, and around 300-500 words. Write in a professional, critical music journalism style."""

        print(f"[DEBUG] Using Gemini REST API (model: {model_name})")
        
        # Use REST API instead of SDK
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
        
        try:
            print(f"[DEBUG] Making POST request to Gemini REST API...")
            response = requests.post(
                api_url,
                headers={'Content-Type': 'application/json'},
                json=payload,
                timeout=30
            )
            print(f"[DEBUG] Gemini API response status: {response.status_code}")
            response.raise_for_status()
            data = response.json()
            print(f"[DEBUG] Gemini API response received")
            
            # Extract text from response
            if 'candidates' in data and len(data['candidates']) > 0:
                candidate = data['candidates'][0]
                if 'content' in candidate and 'parts' in candidate['content']:
                    parts = candidate['content']['parts']
                    if parts and 'text' in parts[0]:
                        overview_text = parts[0]['text'].strip()
                        print(f"[DEBUG] ✅ Successfully extracted text from Gemini response, length: {len(overview_text)}")
                        if len(overview_text) < 50:
                            raise Exception("Gemini returned empty or too short response")
                        return overview_text
            
            print(f"[DEBUG] Unexpected response format: {data}")
            raise Exception(f"Unexpected response format from Gemini API: {data}")
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Gemini REST API request failed: {e}"
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    error_msg += f" Response: {error_data}"
                except:
                    error_msg += f" Response status: {e.response.status_code}"
            print(f"[DEBUG] ❌ {error_msg}")
            raise Exception(error_msg)

    def _fetch_from_wikipedia(self, artist, album):
        """
        Queries the Wikipedia MediaWiki API to fetch an album's
        description and critical reception section.

        Wikipedia is completely free to use in both development
        and production with no API key required.
        """
        base_url = "https://en.wikipedia.org/w/api.php"

        # Strategy 1: Try searching for "{album} ({artist} album)"
        # This handles cases where multiple albums share the same name
        search_queries = [
            f"{album} ({artist} album)",
            f"{album} (album)",
            f"{album} {artist}",
            album
        ]

        page_content = None
        last_error = None

        for query in search_queries:
            try:
                print(f"[DEBUG] Wikipedia: Trying search query: '{query}'")
                page_content = self._search_wikipedia(base_url, query)
                if page_content:
                    print(f"[DEBUG] Wikipedia: Found page content for query '{query}'")
                    break
            except Exception as e:
                last_error = str(e)
                print(f"[DEBUG] Wikipedia: Search query '{query}' failed: {last_error}")
                continue

        if not page_content:
            error_msg = f"No Wikipedia article found for '{album}' by {artist}"
            if last_error:
                error_msg += f" (last error: {last_error})"
            raise Exception(error_msg)

        # Extract relevant sections
        print(f"[DEBUG] Wikipedia: Extracting overview from {len(page_content)} characters of content")
        overview = self._extract_album_overview(page_content, artist, album)

        if not overview:
            print(f"[DEBUG] Wikipedia: No overview extracted from content")
            raise Exception("Wikipedia article found but no useful overview content extracted.")

        print(f"[DEBUG] Wikipedia: Successfully extracted {len(overview)} characters of overview")
        return overview

    def _search_wikipedia(self, base_url, query):
        """
        Searches Wikipedia for a page matching the query and
        returns the page content if found.
        """
        # Step 1: Search for the page
        search_params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srlimit": 3,
            "format": "json",
        }

        try:
            print(f"[DEBUG] Wikipedia: Making search request to {base_url}")
            search_response = requests.get(base_url, params=search_params, timeout=10)
            print(f"[DEBUG] Wikipedia: Search response status: {search_response.status_code}")
            search_response.raise_for_status()
            search_data = search_response.json()
            print(f"[DEBUG] Wikipedia: Search response received")

            search_results = search_data.get("query", {}).get("search", [])
            print(f"[DEBUG] Wikipedia: Found {len(search_results)} search results")

            if not search_results:
                print(f"[DEBUG] Wikipedia: No search results for query '{query}'")
                return None

            # Step 2: Get the full page content for the first result
            page_title = search_results[0]["title"]
            print(f"[DEBUG] Wikipedia: Fetching content for page '{page_title}'")

            content_params = {
                "action": "query",
                "titles": page_title,
                "prop": "extracts",
                "exintro": False,  # Get full content, not just intro
                "explaintext": True,  # Plain text, no HTML
                "format": "json",
            }

            content_response = requests.get(base_url, params=content_params, timeout=10)
            print(f"[DEBUG] Wikipedia: Content response status: {content_response.status_code}")
            content_response.raise_for_status()
            content_data = content_response.json()

            pages = content_data.get("query", {}).get("pages", {})
            print(f"[DEBUG] Wikipedia: Found {len(pages)} pages in response")

            for page_id, page_info in pages.items():
                if page_id == "-1":
                    print(f"[DEBUG] Wikipedia: Page ID -1 indicates page not found")
                    return None
                extract = page_info.get("extract", "")
                print(f"[DEBUG] Wikipedia: Extracted {len(extract)} characters of content")
                return extract

            print(f"[DEBUG] Wikipedia: No extract found in pages")
            return None
        except requests.exceptions.RequestException as e:
            print(f"[DEBUG] Wikipedia: Request exception: {type(e).__name__}: {e}")
            raise Exception(f"Wikipedia API request failed: {e}")
        except Exception as e:
            print(f"[DEBUG] Wikipedia: Unexpected exception: {type(e).__name__}: {e}")
            raise

    def _extract_album_overview(self, content, artist, album):
        """
        Extracts the most relevant sections from a Wikipedia
        article about an album, focusing on:
        - The introduction (general overview)
        - Critical reception
        - Legacy / influence
        """
        if not content:
            return None

        sections_to_extract = []

        # Extract the introduction (everything before the first section header)
        intro_match = re.match(r'^(.*?)(?=\n==\s)', content, re.DOTALL)
        if intro_match:
            intro = intro_match.group(1).strip()
            if len(intro) > 50:  # Only include if substantial
                sections_to_extract.append(f"Overview:\n{intro}")

        # Define section headers we're interested in
        target_sections = [
            r'critical\s*reception',
            r'reception',
            r'legacy',
            r'influence',
            r'review',
            r'critical\s*response',
            r'acclaim',
        ]

        # Extract matching sections
        for section_pattern in target_sections:
            pattern = rf'==\s*({section_pattern})\s*==\s*\n(.*?)(?=\n==\s|\Z)'
            matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
            for header, body in matches:
                body = body.strip()
                if len(body) > 50:  # Only include if substantial
                    sections_to_extract.append(f"{header.strip().title()}:\n{body}")

        if not sections_to_extract:
            # If no specific sections found, use the first 1000 characters
            truncated = content[:1000].strip()
            if len(truncated) > 50:
                sections_to_extract.append(f"Overview:\n{truncated}...")

        if sections_to_extract:
            return "\n\n".join(sections_to_extract)

        return None


class ListsView(APIView):
    """GET /api/lists/ — get user's lists. POST /api/lists/ — create a new list."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all lists for the current user, optionally filtered by list_type (release | person)."""
        try:
            qs = List.objects.filter(user=request.user).order_by("-updated_at")
            list_type = (request.query_params.get("list_type") or "").strip().lower()
            if list_type in ("release", "person"):
                qs = qs.filter(list_type=list_type)
            lists_data = []
            for lst in qs:
                lists_data.append({
                    "id": lst.id,
                    "list_type": lst.list_type,
                    "name": lst.name,
                    "created_at": lst.created_at.isoformat() if lst.created_at else None,
                    "updated_at": lst.updated_at.isoformat() if lst.updated_at else None,
                })
            return Response({"lists": lists_data})
        except Exception as e:
            import traceback
            error_msg = {"error": f"Failed to load lists: {str(e)}"}
            if settings.DEBUG:
                error_msg["traceback"] = traceback.format_exc()
            return Response(
                error_msg,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request):
        """Create a new list. Requires list_type: 'release' (albums) or 'person'."""
        try:
            name = str(request.data.get("name") or "").strip()
            list_type = str(request.data.get("list_type") or List.LIST_TYPE_RELEASE).strip().lower()
            if not name:
                return Response(
                    {"error": "List name is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if list_type not in (List.LIST_TYPE_RELEASE, List.LIST_TYPE_PERSON):
                return Response(
                    {"error": "list_type must be 'release' or 'person'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if List.objects.filter(user=request.user, list_type=list_type, name=name).exists():
                return Response(
                    {"error": "A list with this name already exists for this type"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            list_obj = List.objects.create(user=request.user, list_type=list_type, name=name)
            return Response(
                {
                    "id": list_obj.id,
                    "list_type": list_obj.list_type,
                    "name": list_obj.name,
                    "created_at": list_obj.created_at.isoformat() if list_obj.created_at else None,
                    "updated_at": list_obj.updated_at.isoformat() if list_obj.updated_at else None,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            import traceback
            error_msg = {"error": f"Failed to create list: {str(e)}"}
            if settings.DEBUG:
                error_msg["traceback"] = traceback.format_exc()
            return Response(
                error_msg,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ListItemsView(APIView):
    """POST /api/lists/items/ — add an album to one or more lists."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Add an album to selected lists."""
        try:
            resource_type = str(request.data.get("type") or "").strip().lower()
            resource_id = str(request.data.get("id") or "").strip()
            list_ids = request.data.get("list_ids", [])
            title = str(request.data.get("title") or "").strip()

            if not resource_type or not resource_id:
                return Response(
                    {"error": "Missing required parameters: type and id"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if resource_type not in ("release", "master"):
                return Response(
                    {"error": "type must be 'release' or 'master'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not isinstance(list_ids, list) or not list_ids:
                return Response(
                    {"error": "list_ids must be a non-empty list"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Only allow adding to lists of type 'release' (album lists) when adding a release/master
            user_lists = List.objects.filter(
                user=request.user, id__in=list_ids, list_type=List.LIST_TYPE_RELEASE
            )
            if user_lists.count() != len(list_ids):
                return Response(
                    {"error": "One or more lists not found or are not album lists"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Fetch title from Discogs if not provided
            if not title:
                title = _fetch_display_title_from_discogs(resource_type, resource_id)

            # Add item to each selected list
            added_to = []
            for list_obj in user_lists:
                item, created = ListItem.objects.get_or_create(
                    list=list_obj,
                    type=resource_type,
                    discogs_id=str(resource_id),
                    defaults={"title": title},
                )
                if created:
                    added_to.append(list_obj.id)
                # Update title if it was empty
                elif not item.title and title:
                    item.title = title
                    item.save()

            return Response({"added_to": added_to, "message": f"Added to {len(added_to)} list(s)"})
        except Exception as e:
            import traceback
            error_msg = {"error": f"Failed to add to lists: {str(e)}"}
            if settings.DEBUG:
                error_msg["traceback"] = traceback.format_exc()
            return Response(
                error_msg,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ListItemsCheckView(APIView):
    """GET /api/lists/items/check/?type=release&id=123 — check which lists contain this album."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get which lists contain this album."""
        resource_type = request.query_params.get("type", "").strip().lower()
        resource_id = request.query_params.get("id", "").strip()
        if not resource_type or not resource_id:
            return Response(
                {"error": "Missing required parameters: type and id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if resource_type not in ("release", "master"):
            return Response(
                {"error": "type must be 'release' or 'master'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get all lists that contain this item
        list_ids = ListItem.objects.filter(
            list__user=request.user,
            type=resource_type,
            discogs_id=str(resource_id),
        ).values_list("list_id", flat=True)

        return Response({"list_ids": list(list_ids)})


class ListDetailView(APIView):
    """GET /api/lists/<id>/ — get a single list with its items (for viewing in main area)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, list_id):
        """Return list metadata and its items. Only allowed for user's own lists."""
        list_obj = List.objects.filter(user=request.user, id=list_id).first()
        if not list_obj:
            return Response(
                {"error": "List not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        items = [
            {
                "type": item.type,
                "id": item.discogs_id,
                "title": item.title or f"{item.type}-{item.discogs_id}",
            }
            for item in list_obj.items.all()
        ]
        return Response({
            "id": list_obj.id,
            "list_type": list_obj.list_type,
            "name": list_obj.name,
            "items": items,
        })
