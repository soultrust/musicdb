from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import List, ListItem


class ListEndpointsTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="listuser",
            email="listuser@example.com",
            password="password123",
        )
        self.other_user = User.objects.create_user(
            username="otherlistuser",
            email="otherlistuser@example.com",
            password="password123",
        )
        refresh = RefreshToken.for_user(self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

    def test_create_and_filter_lists(self):
        res = self.client.post(
            "/api/search/lists/",
            data={"name": "Albums A", "list_type": "release"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)

        res = self.client.post(
            "/api/search/lists/",
            data={"name": "Artists A", "list_type": "person"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)

        res = self.client.get("/api/search/lists/?list_type=release")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(len(body.get("lists", [])), 1)
        self.assertEqual(body["lists"][0]["list_type"], "release")

    def test_duplicate_and_invalid_type_rejected(self):
        self.client.post(
            "/api/search/lists/",
            data={"name": "Albums A", "list_type": "release"},
            format="json",
        )
        res = self.client.post(
            "/api/search/lists/",
            data={"name": "Albums A", "list_type": "release"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

        res = self.client.post(
            "/api/search/lists/",
            data={"name": "Bad Type", "list_type": "invalid"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_list_items_add_remove_and_check(self):
        l1 = List.objects.create(user=self.user, list_type=List.LIST_TYPE_RELEASE, name="A")
        l2 = List.objects.create(user=self.user, list_type=List.LIST_TYPE_RELEASE, name="B")

        payload = {
            "type": "release",
            "id": "123",
            "list_ids": [l1.id, l2.id],
            "title": "Artist - Album",
        }
        res = self.client.post("/api/search/lists/items/", data=payload, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            ListItem.objects.filter(type="release", discogs_id="123", list__user=self.user).count(),
            2,
        )

        res = self.client.get("/api/search/lists/items/check/?type=release&id=123")
        self.assertEqual(res.status_code, 200)
        list_ids = set(res.json().get("list_ids", []))
        self.assertEqual(list_ids, {l1.id, l2.id})

        payload["list_ids"] = [l1.id]
        res = self.client.post("/api/search/lists/items/", data=payload, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            ListItem.objects.filter(type="release", discogs_id="123", list__user=self.user).count(),
            1,
        )

    def test_invalid_list_ids_and_list_detail_scope(self):
        own_list = List.objects.create(user=self.user, list_type=List.LIST_TYPE_RELEASE, name="Own")
        other_list = List.objects.create(user=self.other_user, list_type=List.LIST_TYPE_RELEASE, name="Other")

        res = self.client.post(
            "/api/search/lists/items/",
            data={"type": "release", "id": "123", "list_ids": [999999], "title": "X"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

        res = self.client.get(f"/api/search/lists/{own_list.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("id"), own_list.id)

        res = self.client.get(f"/api/search/lists/{other_list.id}/")
        self.assertEqual(res.status_code, 404)
