"""Offline contract tests. Fixtures are synthetic, never production citation data."""

from copy import deepcopy
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from contextlib import redirect_stderr, redirect_stdout
from urllib.error import HTTPError, URLError


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts/update_citations.py"
spec = importlib.util.spec_from_file_location("update_citations", MODULE_PATH)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)
AUTHOR = "test_author"
NOW = "2026-09-20T01:00:00Z"
OLD = "2026-09-19T01:00:00Z"


def catalog(*titles):
    return {"author_id": AUTHOR, "papers": [{"id": f"paper-{i}", "title": title,
            "scholar_id": None, "aliases": []} for i, title in enumerate(titles)]}


def article(title, value=5, suffix="one"):
    return {"title": title, "citation_id": f"{AUTHOR}:{suffix}", "cited_by": {"value": value}}


def page(articles, total=50, offset=0, next_start=None):
    result = {"search_metadata": {"status": "Success"},
              "search_parameters": {"engine": "google_scholar_author", "author_id": AUTHOR, "start": offset},
              "articles": articles, "cited_by": {"table": [{"citations": {"all": total}}]}}
    if next_start is not None:
        result["serpapi_pagination"] = {"next": f"https://serpapi.com/search.json?author_id={AUTHOR}&cstart={next_start}&engine=google_scholar_author"}
    return result


def snapshot_for(titles, articles, previous=None, now=NOW):
    cat = catalog(*titles)
    records, total = sync.collect_pages(AUTHOR, None, [page(articles)])
    return sync.build_snapshot(cat, previous or sync.empty_snapshot(AUTHOR), records, total, now)[0]


class MatchingTests(unittest.TestCase):
    def test_normalization_and_profile_total_are_independent(self):
        snapshot = snapshot_for(["Fitts’ Law: ＸＲ—Study"], [article("fitts' law: XR-Study", 4)])
        self.assertEqual(snapshot["papers"]["paper-0"]["citations"], 4)
        self.assertEqual(snapshot["total_citations"], 50)
        self.assertEqual(snapshot["papers"]["paper-0"]["scholar_url"],
                         sync.article_url(AUTHOR, AUTHOR + ":one"))

    def test_similar_paper_is_not_a_match(self):
        snapshot = snapshot_for(["XR Steering", "XR Steering Extended"], [article("XR Steering", 2)])
        self.assertNotIn("paper-1", snapshot["papers"])

    def test_explicit_zero_is_a_real_count(self):
        snapshot = snapshot_for(["Title"], [article("Title", 0)])
        self.assertEqual(snapshot["papers"]["paper-0"]["citations"], 0)

    def test_missing_value_is_not_zero(self):
        missing = article("Missing", suffix="two")
        missing["cited_by"] = {}
        snapshot = snapshot_for(["Title", "Missing"], [article("Title"), missing])
        self.assertNotIn("paper-1", snapshot["papers"])

    def test_missing_paper_retains_value_and_date(self):
        previous = snapshot_for(["Title", "Other"], [article("Title"), article("Other", 7, "two")], now=OLD)
        current = snapshot_for(["Title", "Other"], [article("Title", 6)], previous)
        self.assertEqual(current["papers"]["paper-1"], previous["papers"]["paper-1"])
        self.assertEqual(current["papers"]["paper-0"]["updated_at"], NOW)
        self.assertEqual(current["updated_at"], NOW)

    def test_missing_count_retains_value_and_date(self):
        previous = snapshot_for(["Title", "Other"], [article("Title"), article("Other", 7, "two")], now=OLD)
        missing = article("Other", suffix="two")
        del missing["cited_by"]
        current = snapshot_for(["Title", "Other"], [article("Title", 6), missing], previous)
        self.assertEqual(current["papers"]["paper-1"], previous["papers"]["paper-1"])

    def test_null_or_blank_count_retains_old_value_without_inventing_zero(self):
        previous = snapshot_for(["Title", "Other"], [article("Title"), article("Other", 7, "two")], now=OLD)
        for value in (None, "", "  "):
            with self.subTest(value=value):
                current = snapshot_for(["Title", "Other"], [article("Title", 6), article("Other", value, "two")], previous)
                self.assertEqual(current["papers"]["paper-1"], previous["papers"]["paper-1"])
                first = snapshot_for(["Title", "Other"], [article("Title", 6), article("Other", value, "two")])
                self.assertNotIn("paper-1", first["papers"])

    def test_literal_integer_strings_are_counts(self):
        for value, expected in (("0", 0), ("5", 5), (" 12 ", 12), ("1,234", 1234), ("12,345,678", 12345678)):
            with self.subTest(value=value):
                current = snapshot_for(["Title"], [article("Title", value)])
                self.assertEqual(current["papers"]["paper-0"]["citations"], expected)

    def test_verified_identity_survives_title_edit(self):
        previous = snapshot_for(["Title"], [article("Title")], now=OLD)
        current = snapshot_for(["Title"], [article("Corrected title", 8)], previous)
        self.assertEqual(current["papers"]["paper-0"]["citations"], 8)

    def test_ambiguous_title_fails(self):
        with self.assertRaisesRegex(sync.UpdateError, "Ambiguous"):
            snapshot_for(["Title"], [article("Title"), article("TITLE", 20, "two")])

    def test_explicit_identity_resolves_duplicate_title(self):
        cat = catalog("Title")
        cat["papers"][0]["scholar_id"] = AUTHOR + ":two"
        records, total = sync.collect_pages(AUTHOR, None, [page([article("Title"), article("Title", 9, "two")])])
        current, _ = sync.build_snapshot(cat, sync.empty_snapshot(AUTHOR), records, total, NOW)
        self.assertEqual(current["papers"]["paper-0"]["citations"], 9)

    def test_alias_is_exact_not_fuzzy(self):
        cat = catalog("Full title")
        cat["papers"][0]["aliases"] = ["Verified shorter title"]
        records, total = sync.collect_pages(AUTHOR, None, [page([article("Verified shorter title", 8)])])
        current, _ = sync.build_snapshot(cat, sync.empty_snapshot(AUTHOR), records, total, NOW)
        self.assertEqual(current["papers"]["paper-0"]["citations"], 8)

    def test_one_scholar_article_cannot_match_two_publications(self):
        with self.assertRaisesRegex(sync.UpdateError, "multiple"):
            snapshot_for(["Title", "TITLE"], [article("Title")])

    def test_known_identity_does_not_fall_back_to_another_version(self):
        previous = snapshot_for(["Title"], [article("Title")], now=OLD)
        with self.assertRaisesRegex(sync.UpdateError, "No unambiguous"):
            snapshot_for(["Title"], [article("Title", 99, "new_version")], previous)


class ValidationTests(unittest.TestCase):
    def test_invalid_article_counts_fail(self):
        for value in (True, False, -1, 1.0, "-1", "1.0", "1k", "1,23", "01,234", "NaN", "5 citations", [], {}):
            with self.subTest(value=value), self.assertRaises(sync.UpdateError):
                sync.collect_pages(AUTHOR, None, [page([article("Title", value)])])

    def test_invalid_count_diagnostic_omits_raw_value(self):
        with self.assertRaises(sync.UpdateError) as raised:
            sync.collect_pages(AUTHOR, None, [page([article("Title", "PRIVATE-RAW-VALUE")])])
        message = str(raised.exception)
        self.assertIn("type=str", message)
        self.assertIn(f"scholar_id={AUTHOR}:one", message)
        self.assertNotIn("PRIVATE-RAW-VALUE", message)

    def test_invalid_profile_counts_fail(self):
        for value in (True, -1, 1.5, "50", None):
            with self.subTest(value=value), self.assertRaises(sync.UpdateError):
                sync.collect_pages(AUTHOR, None, [page([article("Title")], total=value)])

    def test_malformed_provider_payloads_fail(self):
        baseline = page([article("Title")])
        variants = [None, {}, {"error": "secret provider details"}]
        for key in ("search_metadata", "search_parameters", "articles", "cited_by"):
            variant = deepcopy(baseline)
            del variant[key]
            variants.append(variant)
        wrong_author = deepcopy(baseline)
        wrong_author["search_parameters"]["author_id"] = "wrong"
        variants.append(wrong_author)
        for variant in variants:
            with self.subTest(variant=variant), self.assertRaises(sync.UpdateError):
                sync.collect_pages(AUTHOR, None, [variant])

    def test_duplicate_id_fails_even_with_different_titles(self):
        with self.assertRaisesRegex(sync.UpdateError, "Repeated article"):
            sync.collect_pages(AUTHOR, None, [page([article("A"), article("B")])])

    def test_foreign_article_id_fails(self):
        record = article("Title")
        record["citation_id"] = "other_author:one"
        with self.assertRaises(sync.UpdateError):
            sync.collect_pages(AUTHOR, None, [page([record])])


class PaginationTests(unittest.TestCase):
    def test_two_pages_with_cstart_and_fixed_offsets(self):
        pages = [page([article("A")], next_start=1), page([article("B", 3, "two")], offset=1)]
        calls = []
        def fetch(offset):
            calls.append(offset)
            return pages[offset]
        records, total = sync.collect_pages(AUTHOR, fetch)
        self.assertEqual(calls, [0, 1])
        self.assertEqual(len(records), 2)
        self.assertEqual(total, 50)

    def test_missing_required_page_fails(self):
        with self.assertRaisesRegex(sync.UpdateError, "missing a required page"):
            sync.collect_pages(AUTHOR, None, [page([article("A")], next_start=1)])

    def test_next_page_failure_fails_entire_collection(self):
        with self.assertRaises(sync.UpdateError):
            sync.collect_pages(AUTHOR, None, [page([article("A")], next_start=1), {"error": "rate limit"}])

    def test_repeated_article_on_next_page_fails(self):
        with self.assertRaisesRegex(sync.UpdateError, "Repeated article"):
            sync.collect_pages(AUTHOR, None, [page([article("A")], next_start=1), page([article("A")], offset=1)])

    def test_bad_or_cyclic_next_links_fail(self):
        links = ["https://evil.test/search.json?start=1", "https://serpapi.com/search.json?start=0",
                 "https://serpapi.com/search.json?start=2", "https://serpapi.com/search.json?start=1&cstart=2",
                 "https://serpapi.com/search.json?start=1&author_id=wrong"]
        for link in links:
            fixture = page([article("A")])
            fixture["serpapi_pagination"] = {"next": link}
            with self.subTest(link=link), self.assertRaises(sync.UpdateError):
                sync.collect_pages(AUTHOR, None, [fixture])

    def test_profile_total_changed_mid_pagination_fails(self):
        with self.assertRaisesRegex(sync.UpdateError, "changed between pages"):
            sync.collect_pages(AUTHOR, None, [page([article("A")], next_start=1), page([article("B", suffix="two")], 51, 1)])

    def test_full_page_without_next_link_is_checked(self):
        full = [article(f"Title {i}", suffix=str(i)) for i in range(100)]
        records, _ = sync.collect_pages(AUTHOR, None, [page(full), page([], offset=100)])
        self.assertEqual(len(records), 100)

    def test_page_limit_fails_instead_of_publishing_partial_results(self):
        pages = [page([article(str(i), suffix=str(i))], offset=i, next_start=i+1) for i in range(5)]
        with self.assertRaisesRegex(sync.UpdateError, "page limit"):
            sync.collect_pages(AUTHOR, None, pages)


class FileAndNetworkTests(unittest.TestCase):
    def test_offline_cli_writes_and_failure_keeps_exact_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            cat, output, fixture = [base / name for name in ("catalog.json", "citations.json", "response.json")]
            cat.write_text(json.dumps(catalog("Title")), encoding="utf-8")
            fixture.write_text(json.dumps(page([article("Title", 0)])), encoding="utf-8")
            args = ["--catalog", str(cat), "--output", str(output), "--input", str(fixture)]
            with redirect_stdout(io.StringIO()):
                self.assertEqual(sync.main(args), 0)
            before = output.read_bytes()
            fixture.write_text(json.dumps({"error": "DO NOT LOG THIS SECRET"}), encoding="utf-8")
            stderr = io.StringIO()
            with redirect_stderr(stderr):
                self.assertEqual(sync.main(args), 1)
            self.assertEqual(output.read_bytes(), before)
            self.assertNotIn("DO NOT LOG", stderr.getvalue())

    def test_missing_key_does_not_change_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            cat, output = base / "catalog.json", base / "citations.json"
            cat.write_text(json.dumps(catalog("Title")), encoding="utf-8")
            output.write_text(json.dumps(sync.empty_snapshot(AUTHOR)), encoding="utf-8")
            before = output.read_bytes()
            with patch.dict(sync.os.environ, {}, clear=True), redirect_stderr(io.StringIO()):
                self.assertEqual(sync.main(["--catalog", str(cat), "--output", str(output)]), 1)
            self.assertEqual(output.read_bytes(), before)

    def test_failed_atomic_replace_preserves_original_and_removes_temp(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "citations.json"
            output.write_bytes(b"original")
            with patch.object(sync.os, "replace", side_effect=OSError("simulated")):
                with self.assertRaises(sync.UpdateError):
                    sync.atomic_write(output, sync.empty_snapshot(AUTHOR))
            self.assertEqual(output.read_bytes(), b"original")
            self.assertEqual([p.name for p in output.parent.iterdir()], ["citations.json"])

    def test_network_failures_never_leak_request_url_or_key(self):
        secret = "test-key-must-not-appear"
        errors = [HTTPError(f"https://serpapi.com/search.json?api_key={secret}", 401, secret, {}, None),
                  URLError(secret), TimeoutError(secret)]
        for error in errors:
            with self.subTest(error=type(error).__name__), patch.object(sync, "build_opener") as opener:
                opener.return_value.open.side_effect = error
                with self.assertRaises(sync.UpdateError) as raised:
                    sync.fetch_page(secret, AUTHOR, 0)
                self.assertNotIn(secret, str(raised.exception))
                self.assertNotIn("https://", str(raised.exception))

    def test_network_request_uses_fixed_endpoint_parameters(self):
        with patch.object(sync, "build_opener") as opener:
            opener.return_value.open.return_value.__enter__.return_value.read.return_value = json.dumps(page([article("Title")])).encode()
            sync.fetch_page("synthetic-secret", AUTHOR, 100)
            request = opener.return_value.open.call_args.args[0]
            parsed = sync.urlsplit(request.full_url)
            params = sync.parse_qs(parsed.query)
            self.assertEqual(parsed.scheme + "://" + parsed.netloc + parsed.path, sync.ENDPOINT)
            self.assertEqual(params["start"], ["100"])
            self.assertEqual(params["num"], ["100"])
            self.assertEqual(params["no_cache"], ["true"])
            self.assertEqual(params["author_id"], [AUTHOR])


if __name__ == "__main__":
    unittest.main()
