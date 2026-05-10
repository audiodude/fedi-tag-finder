# fedi-tag-finder

Paste a Mastodon post draft. Get the 3 highest-reach hashtags appended.

A static, browser-only tool. Uses Claude Haiku 4.5 to extract hashtag candidates from your post text, then ranks them by real 7-day usage from `mastodon.social`'s `/api/v1/tags/:name` endpoint, and rewrites the post with the top 3 appended.

## Usage

1. Open the deployed site (or serve locally — see below).
2. Paste an [Anthropic API key](https://console.anthropic.com/) into Settings (stored in your browser's localStorage).
3. Type your post draft and hit **Find tags & append**.

Existing `#hashtags` in your draft are stripped before suggestion — the app picks fresh based on the post's content.

## How it works

```
post text
  → strip existing #tags
  → Claude Haiku 4.5 extracts ~8-15 candidate hashtags (with prompt caching)
  → fetch /api/v1/tags/:name from mastodon.social for each (in parallel)
  → sort by 7-day uses
  → append top 3 to the post
```

Tag volumes come from `mastodon.social`'s view of the fediverse. It sees a large cross-section of public hashtag activity, so its 7-day counts are a reasonable proxy for "how many people will see posts with this tag" — but it's one instance, not the whole network.

## Security note

Your Anthropic API key sits in `localStorage` and is sent directly from the browser to `api.anthropic.com` using the `anthropic-dangerous-direct-browser-access` header. This is fine for personal use on your own machine. **Don't use this on a shared computer**, and don't deploy a multi-user version that asks visitors to paste their keys — they'd be exposing them to your origin's JS context.

## Local development

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

No build step. Three files: `index.html`, `styles.css`, `app.js`.

## Deployment

Pushes to the `release` branch deploy to Cloudflare Pages via GitHub Actions (see `.github/workflows/deploy.yml`).

To deploy: `git checkout release && git merge main && git push`

## License

MIT
