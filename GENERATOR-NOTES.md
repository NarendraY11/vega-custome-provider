# Vega Provider Generator 2.3

Source website: https://hentai.pro/
Crawled pages: 8

## Publish this ZIP to GitHub

This archive is already a standalone Vega provider source. Do **not** upload the ZIP file itself to Vega. Extract the ZIP and publish all of its contents at the root of a GitHub repository.

The repository must expose these paths:

- /manifest.json
- /dist/watch-hentai-series-online-in-high-quali/catalog.js
- /dist/watch-hentai-series-online-in-high-quali/posts.js
- /dist/watch-hentai-series-online-in-high-quali/meta.js
- /dist/watch-hentai-series-online-in-high-quali/stream.js
- /dist/watch-hentai-series-online-in-high-quali/episodes.js (when generated)

In Vega: Settings > Provider Manager > + > enter the GitHub repository URL. For example:

https://github.com/YOUR-USERNAME/YOUR-REPOSITORY

Vega reads manifest.json and then loads the built JavaScript modules from dist/watch-hentai-series-online-in-high-quali/. You do not need to run npm install or npm run build for a generated standalone package.

## Existing multi-provider repository

If you are adding this provider to an existing repository such as a shared 'vega-providers' repository, do **not** replace the existing manifest.json. Copy providers/watch-hentai-series-online-in-high-quali/ and dist/watch-hentai-series-online-in-high-quali/, then merge the generated entry from manifest-entry.json into the existing manifest array. Commit and push the changes.

## Important

Generated code is heuristic and should be tested in Vega. Sites using custom APIs, authentication, DRM, CAPTCHA, aggressive anti-bot systems, or frequently changing layouts may require manual provider code changes.
