# Yushi Wei — Academic Website

A bilingual academic website for Yushi Wei (魏雨石), including research, publications, academic activities, and a photographic collection.

## GitHub Pages deployment

Deployment target: **https://yushi-wei.github.io/**.

1. Use the **Yushi-Wei** GitHub account and create a **public** repository named **yushi-wei.github.io**.
2. Upload this entire project, including `.github/workflows/pages.yml`, to its `main` branch.
3. Open **Settings → Pages → Build and deployment → Source**, and select **GitHub Actions**.
4. Open **Actions → Deploy academic website → Run workflow** if the initial upload occurred before Pages was enabled.
5. Wait for the deployment to succeed, then open the website URL above.

Later pushes to `main` automatically publish the contents of `dist`. This project requires no package installation or build step. The repository name must match the owner's username followed by `.github.io`; no custom CNAME is required for this address.

## Local preview

```sh
python -m http.server 4321 --directory dist
```

Open http://localhost:4321/ in a browser.

## Project structure

- `dist/index.html`: Home and biography
- `dist/research/index.html`: Research themes and publications
- `dist/academic/index.html`: Funding, patents, recognition, and service
- `dist/life/index.html`: Photographic collection
- `dist/language.js` and `dist/language.css`: Chinese translations and typography
- `dist/motion.css`, `dist/page-transition.js`, and `dist/script.js`: Animation and page interactions
- `dist/life.js`: Photo viewer
- `dist/assets/`: Website-ready artwork and optimized photographs
- `dist/robots.txt` and `dist/sitemap.xml`: Search discovery configuration
- `.github/workflows/pages.yml`: GitHub Pages deployment

## Content and maintenance

English is the default, with a persistent Chinese language preference. Motion respects reduced-motion preferences and progressively enhances normal navigation.

Edit the HTML and the corresponding Chinese entries in `dist/language.js`. Update each changed page's sitemap date and cache version strings for changed shared styles or scripts. Preview all four pages before publishing.

Links and asset paths use the domain root. Canonical URLs, Open Graph metadata, homepage structured data, robots.txt, and sitemap.xml target `https://yushi-wei.github.io`. Update these together if the primary domain changes. Search Console and Baidu verification must use values issued by the website owner's accounts.

The export contains optimized photographs and generated or edited decorative artwork. Original photographs, credentials, temporary files, deployment identifiers, and earlier edit history are excluded.
