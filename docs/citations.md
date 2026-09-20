# Daily Google Scholar citations

The production website is https://yushi-wei.github.io/ and the public source repository is https://github.com/Yushi-Wei/yushi-wei.github.io.

The Research page reads `dist/data/citations.json`. The total beside **Publications.** is the Google Scholar profile's total, not the sum of the visible or filtered papers. Individual papers show their own verified counts. Both English and Chinese display the date of the last successful observation. Missing data is omitted, while a verified zero remains visible.

## One-time setup

1. Create a SerpApi account at https://serpapi.com/users/sign_up. The free plan currently includes 250 searches per month; a profile with fewer than 100 articles usually takes one search per refresh.
2. In the repository, open **Settings → Secrets and variables → Actions → New repository secret**: https://github.com/Yushi-Wei/yushi-wei.github.io/settings/secrets/actions.
3. Set the name to `SERPAPI_API_KEY` and the value to the API key from your SerpApi account. Never put the key in the public repository or frontend JavaScript.
4. Open **Actions → Deploy academic website → Run workflow**, select `main`, and run it. The first successful run saves the citation snapshot and publishes the website.

## How updates work

The Pages workflow runs once a day, scheduled for **08:23 in China (00:23 UTC)**. GitHub may start scheduled jobs later when busy. The workflow also runs when `main` is updated and can be started manually. Successful observations are committed to `dist/data/citations.json` and deployed in the same run. The computer used to develop the site does not need to remain on.

The importer reads the Scholar author profile `DXJTi30AAAAJ` through the [SerpApi Google Scholar Author API](https://serpapi.com/google-scholar-author-api). It does not use a visitor's Google account, and the `authuser=1` parameter from the personal browser link is unnecessary. It retrieves up to 100 articles per API request, with bounded pagination for larger profiles. This updates the website's snapshot; Google Scholar determines when its underlying index and citation counts change.

The publication catalog in `scripts/publications.json` maps the website's stable paper IDs to full titles and optional Scholar IDs or verified title aliases. New papers should receive a unique `data-publication-id` in `dist/research/index.html` and a matching catalog entry. Scholar IDs or title aliases can resolve verified title differences. Approximate title similarity is never enough to assign a count automatically.

An API failure leaves the previous snapshot and observation dates intact. A previously matched paper temporarily absent from the response retains its previous count and individual observation date. Unknown counts are not converted to zero. Daily or manual refresh failures are reported as failed runs. Normal website commits can still deploy with the previous snapshot if the key is missing or the data provider is unavailable.

## Maintenance

- Run the offline checks with `python -m unittest discover -s tests -p 'test_*.py'`.
- The timestamp changes on successful daily refreshes, keeping a record of actual observations even when counts do not change.
- GitHub [can disable schedules after 60 days without repository activity](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). Successful daily snapshot commits provide activity; after a prolonged outage, check that the workflow is still enabled.
- If a run fails, inspect the Actions run and the age of the last snapshot. The updater avoids logging API keys or complete request URLs.
- The initial checked-in snapshot intentionally contains no statistics. Citation numbers appear only after a successful data retrieval.

Pricing and API documentation checked on 20 September 2026: https://serpapi.com/pricing and https://serpapi.com/google-scholar-author-api.
