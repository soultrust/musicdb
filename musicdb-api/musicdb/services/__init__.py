"""Domain services used by API views (keeps views thin and testable)."""

from .overview_service import fetch_album_overview_outcome

__all__ = ["fetch_album_overview_outcome"]
