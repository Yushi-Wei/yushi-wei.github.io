#!/usr/bin/env python3
"""Refresh verified Google Scholar counts through SerpApi; Python 3.10+.

Live: SERPAPI_API_KEY must be set in the environment.
Offline: --input accepts a saved SerpApi response or {"pages": [response, ...]}.
An unsuccessful run never replaces the previous snapshot or its timestamps.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = "https://serpapi.com/search.json"
PAGE_SIZE = 100
MAX_PAGES = 5
MAX_RESPONSE_BYTES = 5_000_000
ID_PATTERN = re.compile(r"[A-Za-z0-9_-]+")


class UpdateError(Exception):
    """A safe, intentionally nonsensitive error suitable for workflow logs."""


def require(condition, message):
    if not condition:
        raise UpdateError(message)


def count(value, field):
    require(type(value) is int and value >= 0, f"Invalid nonnegative integer: {field}.")
    return value


def article_count(value, identity):
    # The provider can represent an absent count as null or a blank string.
    # Neither is evidence of zero; retain the previous count when available.
    if value is None:
        return None
    if isinstance(value, str):
        literal = value.strip()
        if not literal:
            return None
        if re.fullmatch(r"(?:[0-9]+|[1-9][0-9]{0,2}(?:,[0-9]{3})+)", literal):
            return int(literal.replace(",", ""))
    return count(value, f"article citations (type={type(value).__name__}, scholar_id={identity})")


def normalize_title(value):
    require(isinstance(value, str) and value.strip(), "Missing or invalid article title.")
    text = unicodedata.normalize("NFKC", value).casefold()
    # Remove only punctuation variation; preserve all words, numbers, and symbols.
    text = "".join(" " if unicodedata.category(c).startswith("P") else c for c in text)
    return " ".join(text.split())


def scholar_id(value, author_id):
    require(isinstance(value, str), "Invalid Scholar article identity.")
    parts = value.split(":")
    require(len(parts) == 2 and parts[0] == author_id and
            ID_PATTERN.fullmatch(parts[1]) is not None, "Invalid Scholar article identity.")
    return value


def article_url(author_id, citation_id):
    return "https://scholar.google.com/citations?" + urlencode({
        "view_op": "view_citation", "user": author_id, "citation_for_view": citation_id,
    })


def profile_url(author_id):
    return "https://scholar.google.com/citations?" + urlencode({"user": author_id})


def timestamp(value, nullable=False):
    if nullable and value is None:
        return None
    require(isinstance(value, str) and value.endswith("Z"), "Invalid snapshot timestamp.")
    try:
        parsed = datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError:
        raise UpdateError("Invalid snapshot timestamp.") from None
    require(parsed.utcoffset().total_seconds() == 0, "Invalid snapshot timestamp.")
    return value


def load_json(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8-sig"))
    except (OSError, UnicodeError, ValueError):
        raise UpdateError("Unable to read a valid local JSON file.") from None


def validate_catalog(catalog):
    require(isinstance(catalog, dict), "Invalid publication catalog.")
    author = catalog.get("author_id")
    require(isinstance(author, str) and ID_PATTERN.fullmatch(author), "Invalid author identity.")
    papers = catalog.get("papers")
    require(isinstance(papers, list) and papers, "Publication catalog is empty or invalid.")
    ids, explicit_ids = set(), set()
    for paper in papers:
        require(isinstance(paper, dict), "Invalid publication catalog entry.")
        stable = paper.get("id")
        require(isinstance(stable, str) and ID_PATTERN.fullmatch(stable) and stable not in ids,
                "Invalid or duplicate publication identity.")
        ids.add(stable)
        normalize_title(paper.get("title"))
        aliases = paper.get("aliases", [])
        require(isinstance(aliases, list), "Invalid title aliases.")
        for alias in aliases:
            normalize_title(alias)
        if paper.get("scholar_id") is not None:
            identity = scholar_id(paper["scholar_id"], author)
            require(identity not in explicit_ids, "Duplicate explicit Scholar identity.")
            explicit_ids.add(identity)
    return author, papers


def empty_snapshot(author):
    return {"version": 1, "author_id": author, "profile_url": profile_url(author),
            "updated_at": None, "total_citations": None, "papers": {}}


def validate_previous(previous, author, catalog_papers):
    require(isinstance(previous, dict) and type(previous.get("version")) is int and
            previous["version"] == 1 and previous.get("author_id") == author,
            "Previous snapshot has an invalid version or author.")
    require(previous.get("profile_url") == profile_url(author), "Invalid previous profile URL.")
    updated = timestamp(previous.get("updated_at"), nullable=True)
    total = previous.get("total_citations")
    if total is not None:
        count(total, "previous profile citations")
    papers = previous.get("papers")
    require(isinstance(papers, dict), "Invalid previous paper snapshot.")
    require(updated is not None or (not papers and total is None), "Incomplete previous snapshot.")
    known = {paper["id"] for paper in catalog_papers}
    identities = set()
    for stable, paper in papers.items():
        require(stable in known and isinstance(paper, dict), "Unknown previous publication identity.")
        count(paper.get("citations"), "previous article citations")
        identity = scholar_id(paper.get("scholar_id"), author)
        require(identity not in identities, "Duplicate previous Scholar identity.")
        identities.add(identity)
        require(paper.get("scholar_url") == article_url(author, identity), "Invalid previous article URL.")
        timestamp(paper.get("updated_at"))
    return previous


def profile_total(payload, required):
    cited = payload.get("cited_by")
    if cited is None and not required:
        return None
    require(isinstance(cited, dict) and isinstance(cited.get("table"), list),
            "Missing or invalid profile citation table.")
    matches = []
    for row in cited["table"]:
        require(isinstance(row, dict), "Invalid profile citation table row.")
        if "citations" in row:
            require(isinstance(row["citations"], dict), "Invalid profile citation total.")
            matches.append(count(row["citations"].get("all"), "profile citations"))
    require(len(matches) == 1, "Missing or ambiguous profile citation total.")
    return matches[0]


def parse_page(payload, author, offset):
    require(isinstance(payload, dict), "Invalid provider response.")
    require("error" not in payload, "Citation provider reported an error; previous data retained.")
    metadata = payload.get("search_metadata")
    require(isinstance(metadata, dict) and metadata.get("status") == "Success",
            "Citation provider did not return a successful result.")
    parameters = payload.get("search_parameters")
    require(isinstance(parameters, dict) and parameters.get("author_id") == author and
            parameters.get("engine") == "google_scholar_author", "Provider response author mismatch.")
    for key in ("start", "cstart"):
        if key in parameters:
            require(str(parameters[key]) == str(offset), "Provider response pagination mismatch.")
    articles = payload.get("articles")
    require(isinstance(articles, list) and len(articles) <= PAGE_SIZE, "Missing or invalid article list.")
    parsed = []
    for article in articles:
        require(isinstance(article, dict), "Invalid article record.")
        title = normalize_title(article.get("title"))
        identity = scholar_id(article.get("citation_id"), author)
        cited = article.get("cited_by", {})
        require(isinstance(cited, dict), "Invalid article citation details.")
        # Absence means unknown, including zero-citation articles omitted by the provider.
        value = article_count(cited.get("value"), identity)
        parsed.append({"title": title, "scholar_id": identity, "citations": value})
    return parsed, profile_total(payload, required=(offset == 0)), next_offset(payload, author, offset, len(parsed))


def next_offset(payload, author, offset, article_count):
    pagination = payload.get("serpapi_pagination", {})
    require(isinstance(pagination, dict), "Invalid pagination details.")
    link = pagination.get("next")
    if link is None:
        # A full page without an explicit next link must be checked for truncation.
        return offset + article_count if article_count == PAGE_SIZE else None
    require(isinstance(link, str) and link, "Invalid next-page reference.")
    try:
        parsed = urlsplit(link)
        query = parse_qs(parsed.query, strict_parsing=True)
        valid_origin = (parsed.scheme == "https" and parsed.hostname == "serpapi.com" and
                        parsed.port is None and not parsed.username and not parsed.password and
                        not parsed.fragment and parsed.path in ("/search", "/search.json"))
    except ValueError:
        raise UpdateError("Invalid next-page reference.") from None
    require(valid_origin, "Invalid next-page reference.")
    for key, expected in (("author_id", author), ("engine", "google_scholar_author")):
        require(query.get(key, [expected]) == [expected], "Pagination author or engine mismatch.")
    values = [value for key in ("start", "cstart") for value in query.get(key, [])]
    require(bool(values) and all(re.fullmatch(r"[0-9]+", value) for value in values),
            "Missing or invalid next-page offset.")
    offsets = {int(value) for value in values}
    require(len(offsets) == 1, "Conflicting next-page offsets.")
    result = offsets.pop()
    require(article_count > 0 and result == offset + article_count,
            "Incomplete, repeated, or out-of-order pagination.")
    return result


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise UpdateError("Unexpected redirect from citation provider.")


def fetch_page(api_key, author, offset):
    query = urlencode({"engine": "google_scholar_author", "author_id": author,
                       "hl": "en", "num": PAGE_SIZE, "start": offset,
                       "no_cache": "true", "api_key": api_key})
    request = Request(ENDPOINT + "?" + query, headers={"Accept": "application/json"})
    try:
        # Reject redirects so a request containing the secret cannot leave this endpoint.
        with build_opener(NoRedirects()).open(request, timeout=45) as response:
            raw = response.read(MAX_RESPONSE_BYTES + 1)
        require(len(raw) <= MAX_RESPONSE_BYTES, "Citation provider response exceeded the size limit.")
        return json.loads(raw)
    except HTTPError as error:
        raise UpdateError(f"Citation provider HTTP {error.code}; previous data retained.") from None
    except (URLError, TimeoutError, OSError):
        raise UpdateError("Citation provider request failed; previous data retained.") from None
    except (ValueError, UnicodeError):
        raise UpdateError("Citation provider returned invalid JSON; previous data retained.") from None


def collect_pages(author, fetch, supplied_pages=None):
    records, identities = [], set()
    offset, total = 0, None
    for page_index in range(MAX_PAGES):
        if supplied_pages is not None:
            require(page_index < len(supplied_pages), "Offline input is missing a required page.")
            payload = supplied_pages[page_index]
        else:
            payload = fetch(offset)
        articles, page_total, following = parse_page(payload, author, offset)
        if page_index == 0:
            total = page_total
        elif page_total is not None:
            require(page_total == total, "Profile total changed between pages; retry a complete snapshot.")
        for record in articles:
            require(record["scholar_id"] not in identities, "Repeated article identity across provider results.")
            identities.add(record["scholar_id"])
            records.append(record)
        if following is None:
            require(supplied_pages is None or page_index + 1 == len(supplied_pages),
                    "Offline input contains unexpected extra pages.")
            return records, total
        offset = following
    raise UpdateError("Citation results exceeded the page limit; previous data retained.")


def build_snapshot(catalog, previous, records, total, now):
    author, papers = validate_catalog(catalog)
    validate_previous(previous, author, papers)
    timestamp(now)
    count(total, "profile citations")
    by_id = {record["scholar_id"]: record for record in records}
    by_title = defaultdict(list)
    for record in records:
        by_title[record["title"]].append(record)
    result = empty_snapshot(author)
    result.update({"updated_at": now, "total_citations": total})
    claimed, fresh = {}, 0
    for paper in papers:
        stable = paper["id"]
        old = previous["papers"].get(stable)
        explicit = paper.get("scholar_id")
        learned = old["scholar_id"] if old else None
        require(not (explicit and learned and explicit != learned),
                "Explicit Scholar identity conflicts with the verified snapshot.")
        identity = explicit or learned
        if identity:
            # Once verified, identity is authoritative even if the Scholar title is edited.
            record = by_id.get(identity)
        else:
            titles = {normalize_title(paper["title"]), *(normalize_title(a) for a in paper.get("aliases", []))}
            candidates = {r["scholar_id"]: r for title in titles for r in by_title.get(title, [])}
            require(len(candidates) <= 1, "Ambiguous title match; add a verified Scholar identity to the catalog.")
            record = next(iter(candidates.values()), None)
        if record:
            identity = record["scholar_id"]
            require(identity not in claimed, "One Scholar article matches multiple website publications.")
            claimed[identity] = stable
        if record and record["citations"] is not None:
            result["papers"][stable] = {"citations": record["citations"], "scholar_id": identity,
                                        "scholar_url": article_url(author, identity), "updated_at": now}
            fresh += 1
        elif old:
            # Keep both the verified count and its original date when it is not refreshed.
            result["papers"][stable] = dict(old)
    require(fresh > 0, "No unambiguous article counts matched; previous data retained.")
    validate_previous(result, author, papers)
    return result, fresh


def atomic_write(path, snapshot):
    path = Path(path)
    temporary = None
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         prefix=".citations-", suffix=".tmp", delete=False) as handle:
            temporary = Path(handle.name)
            json.dump(snapshot, handle, ensure_ascii=False, indent=2, allow_nan=False)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    except OSError:
        raise UpdateError("Unable to replace citation snapshot; previous data retained.") from None
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink(missing_ok=True)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=ROOT / "scripts/publications.json")
    parser.add_argument("--output", type=Path, default=ROOT / "dist/data/citations.json")
    parser.add_argument("--input", type=Path, help="Saved SerpApi response or object with a pages array; no network")
    args = parser.parse_args(argv)
    try:
        catalog = load_json(args.catalog)
        author, papers = validate_catalog(catalog)
        previous = load_json(args.output) if args.output.exists() else empty_snapshot(author)
        validate_previous(previous, author, papers)
        if args.input:
            source = load_json(args.input)
            pages = source["pages"] if isinstance(source, dict) and "pages" in source else [source]
            require(isinstance(pages, list) and 1 <= len(pages) <= MAX_PAGES, "Invalid offline page collection.")
            records, total = collect_pages(author, None, supplied_pages=pages)
        else:
            api_key = os.environ.get("SERPAPI_API_KEY", "").strip()
            require(bool(api_key), "SERPAPI_API_KEY is not configured; previous data retained.")
            records, total = collect_pages(author, lambda offset: fetch_page(api_key, author, offset))
        now = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        snapshot, fresh = build_snapshot(catalog, previous, records, total, now)
        atomic_write(args.output, snapshot)
        print(f"Citation snapshot updated: {fresh}/{len(papers)} refreshed, {len(snapshot['papers']) - fresh} retained, "
              f"{len(papers) - len(snapshot['papers'])} unmatched.")
        for paper in papers:
            if paper["id"] not in snapshot["papers"]:
                title = " ".join(paper["title"].split())[:240]
                print(f"Unmatched publication: {paper['id']} - {title}")
        return 0
    except UpdateError as error:
        print(f"Citation update failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
