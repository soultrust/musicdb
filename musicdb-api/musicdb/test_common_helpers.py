"""Tests for small helpers in views/common.py."""

from django.test import SimpleTestCase

from musicdb.views.common import (
    _format_duration_from_mb_length,
    _parse_optional_int,
    _validate_choice,
)


class FormatDurationFromMbLengthTests(SimpleTestCase):
    def test_empty_returns_empty_string(self):
        self.assertEqual(_format_duration_from_mb_length(None), "")
        self.assertEqual(_format_duration_from_mb_length(""), "")

    def test_integer_ms(self):
        self.assertEqual(_format_duration_from_mb_length(65000), "1:05")
        self.assertEqual(_format_duration_from_mb_length(0), "0:00")

    def test_string_ms(self):
        self.assertEqual(_format_duration_from_mb_length("180000"), "3:00")

    def test_invalid_returns_empty(self):
        self.assertEqual(_format_duration_from_mb_length("abc"), "")


class ParseOptionalIntTests(SimpleTestCase):
    def test_none_and_blank(self):
        self.assertIsNone(_parse_optional_int(None))
        self.assertIsNone(_parse_optional_int(""))

    def test_valid(self):
        self.assertEqual(_parse_optional_int("42"), 42)
        self.assertEqual(_parse_optional_int(7), 7)

    def test_invalid(self):
        self.assertIsNone(_parse_optional_int("x"))


class ValidateChoiceTests(SimpleTestCase):
    def test_allowed_returns_none(self):
        self.assertIsNone(_validate_choice("album", ("album", "artist"), "type"))

    def test_bad_returns_response(self):
        res = _validate_choice("bad", ("album", "artist"), "type")
        self.assertIsNotNone(res)
        self.assertEqual(res.status_code, 400)
