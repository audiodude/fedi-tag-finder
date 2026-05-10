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

Live at **https://tags.x-5.dev/**.

Pushes to the `release` branch deploy to Cloudflare Pages via GitHub Actions (see `.github/workflows/deploy.yml`). To ship: `git checkout release && git merge main && git push`. Deploys take ~25 seconds.

### Setting up your own deploy

If you fork this repo:

1. Create a Cloudflare Pages project (Direct Upload mode, no Git integration needed):
   ```sh
   curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects" \
     -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
     --data '{"name":"your-project-name","production_branch":"release"}'
   ```

2. Set GitHub Actions secrets on your repo:
   ```sh
   gh secret set CLOUDFLARE_API_TOKEN --body "$CF_API_TOKEN"
   gh secret set CLOUDFLARE_ACCOUNT_ID --body "$CF_ACCOUNT_ID"
   ```
   The token needs `Account → Cloudflare Pages → Edit` permission.

3. Update `--project-name=fedi-tag-finder` in `.github/workflows/deploy.yml` to match your project.

4. Push to `release` to trigger the first deploy.

### Custom domain

If using Cloudflare DNS, add the domain to the Pages project and a proxied CNAME pointing at `<project>.pages.dev`. Cert issuance takes <1 minute. With a non-Cloudflare DNS provider you'll also need the verification TXT record from the Pages project status.

## License

MIT
