# NM7 TV Web — Cloudflare deployment

This project is deployed as a Cloudflare Worker with Static Assets.

## Runtime layout

- `worker.js`: API and playback proxy worker.
- `web-tv/`: static NM7 TV web client.
- `wrangler.toml`: Cloudflare Workers + Assets configuration.
- `.github/workflows/cloudflare-deploy.yml`: automatic deploy on pushes to `main` or `feat/tvdrm-player-integration-20261004`.

The Worker handles:

- `/api/playlist`
- `/api/probe`
- `/api/stream`
- `/api/license`
- `/api/image`

The legacy `vercel.json` deployment configuration has been removed.

## One-time GitHub secret setup

Add these repository secrets in GitHub:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The token should have the minimum Workers deployment permissions required for this Worker. Cloudflare's current CI guidance recommends an API token plus account ID and explicitly recommends storing them as CI/CD secrets rather than in the repository.

After the secrets exist, every push to the configured branches runs Wrangler deploy automatically.

## Expected Cloudflare URL

With the Worker name `nm7-tv-web`, Cloudflare will expose the Worker on its assigned `workers.dev` hostname unless a custom domain is configured.

The exact hostname is account-specific and is therefore not hard-coded into the repository.
