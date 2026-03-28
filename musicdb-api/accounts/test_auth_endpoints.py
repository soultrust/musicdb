"""Tests for register and login JWT endpoints."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class RegisterViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_returns_tokens_and_user(self):
        res = self.client.post(
            "/api/auth/register/",
            {"email": "new@example.com", "password": "secret-pass-123"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        body = res.json()
        self.assertIn("access", body)
        self.assertIn("refresh", body)
        self.assertEqual(body["user"]["email"], "new@example.com")
        self.assertTrue(User.objects.filter(email="new@example.com").exists())

    def test_register_requires_email_and_password(self):
        res = self.client.post("/api/auth/register/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_rejects_duplicate_email(self):
        User.objects.create_user(username="u1", email="dup@example.com", password="x")
        res = self.client.post(
            "/api/auth/register/",
            {"email": "dup@example.com", "password": "secret-pass-123"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already exists", res.json().get("error", ""))


class LoginViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User.objects.create_user(username="loginu", email="login@example.com", password="correct-horse")

    def test_login_success(self):
        res = self.client.post(
            "/api/auth/login/",
            {"email": "login@example.com", "password": "correct-horse"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertIn("access", body)
        self.assertEqual(body["user"]["email"], "login@example.com")

    def test_login_requires_credentials(self):
        res = self.client.post("/api/auth/login/", {"email": ""}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_invalid_password(self):
        res = self.client.post(
            "/api/auth/login/",
            {"email": "login@example.com", "password": "wrong"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
