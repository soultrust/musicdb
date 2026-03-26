from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import TrackEspeciallyLiked


class EspeciallyLikedEndpointsTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="user1",
            email="user1@example.com",
            password="password123",
        )

        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)

        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        self.noauth_client = APIClient()

        self.item_type = "release"
        self.item_id = "11111111-1111-1111-1111-111111111111"
        self.track_position = "1"
        self.track_title = "Test Track"

        self.post_payload = {
            "item_type": self.item_type,
            "item_id": self.item_id,
            "track_position": self.track_position,
            "track_title": self.track_title,
        }

    def test_requires_auth(self):
        res = self.noauth_client.get(
            f"/api/search/especially-liked-tracks/?item_type={self.item_type}&item_id={self.item_id}"
        )
        self.assertIn(res.status_code, (401, 403))

        res = self.noauth_client.post(
            "/api/search/especially-liked-track/",
            data={**self.post_payload, "especially_liked": True},
            format="json",
        )
        self.assertIn(res.status_code, (401, 403))

    def test_create_list_and_delete(self):
        # Create/upsert
        res = self.client.post(
            "/api/search/especially-liked-track/",
            data={**self.post_payload, "especially_liked": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(
            TrackEspeciallyLiked.objects.filter(
                user=self.user,
                item_type=self.item_type,
                item_id=self.item_id,
                track_position=self.track_position,
                track_title=self.track_title,
            ).exists()
        )
        self.assertEqual(TrackEspeciallyLiked.objects.count(), 1)

        # Upsert again should not duplicate
        res = self.client.post(
            "/api/search/especially-liked-track/",
            data={**self.post_payload, "especially_liked": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(TrackEspeciallyLiked.objects.count(), 1)

        # List
        res = self.client.get(
            f"/api/search/especially-liked-tracks/?item_type={self.item_type}&item_id={self.item_id}"
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(len(body.get("tracks", [])), 1)

        # Delete
        res = self.client.post(
            "/api/search/especially-liked-track/",
            data={**self.post_payload, "especially_liked": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(TrackEspeciallyLiked.objects.count(), 0)

        res = self.client.get(
            f"/api/search/especially-liked-tracks/?item_type={self.item_type}&item_id={self.item_id}"
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(len(body.get("tracks", [])), 0)

