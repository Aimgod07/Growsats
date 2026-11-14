# Playloot

React, Vite, and Capacitor app backed by a Cloudflare Worker, D1, and R2.

## Existing production API

- Worker: `playloot-api` at `https://playloot-api.choudharydeepanshu160.workers.dev`
- D1: `playloot-prod-db` (bound as `DB`)
- R2: `playloot-prod-files` (bound as `FILES`)
- Worker secret: `TWO_STEP_ENCRYPTION_KEY` (32 random bytes, Base64 encoded)
- Worker secret: `REDEMPTION_ADMIN_KEY` (random admin credential)

`wrangler.jsonc` and `migrations/` describe the existing production Worker in this repository. The separate `playloot-backend` project is the active local development API.

## Local development

The active development API is the separate `playloot-backend` project. Run `npm run dev` there and `npm run dev` in this frontend project. That Worker listens on port 8787, which matches `.env.development`. The `worker/` and `server/` directories in this project are older backend implementations and are not used by the development app.

For a production web build or Android app, `npm run build` uses `.env.production` and the existing `playloot-api` HTTPS Worker. Run `npx cap sync android` after rebuilding Android assets. The separate `playloot-backend` project still needs its production D1 binding and deployment URL configured before the production frontend can switch to it.

## Operations and limits

- D1 reward triggers update wallet balances atomically. Daily claims, mission rewards, spins, and play claims use unique keys to prevent duplicate awards. A play claim unlocks after two server-timed minutes; each completed minute after that earns 10 coins, up to two hours per session. The separate development backend applies the same rule and updates the wallet and reward ledger in one D1 batch.
- Account passwords use salted PBKDF2 and login attempts are limited. Sessions are stored as token hashes with a 30-day expiry. Authenticator secrets are encrypted with the Worker secret.
- Keep the ignored `.prod.secrets` file safe. It holds recovery copies of the production Worker secrets. Never commit or publish it. To review pending redemptions, call `GET /api/admin/redemptions` with the `x-admin-key` header. To mark one fulfilled or rejected, call `PATCH /api/admin/redemptions/{id}` with JSON `{"status":"fulfilled"}` or `{"status":"rejected"}`. Rejecting a request refunds coins once.
- Uploads accept PNG, JPEG, and WebP images up to 2 MB. R2 objects are not publicly listed.
- Redemption requests are recorded as `pending` and deduct coins. The admin endpoint supports manual fulfillment and refunds. Connect a fulfillment provider before offering automatic gift cards or cash payouts.
- New accounts are limited per IP. Referral coins are awarded after the invited account completes its first eligible play claim. Email ownership and actual game results are not yet verified by an external provider.
- External games control their own graphics, frame rate, and multiplayer. The settings are stored as preferences. Play time can be checked by the Worker, but verified game results require a trusted game provider callback.

The old `server/` Node implementation and `worker/` Worker implementation remain for reference and the existing production setup. The frontend development server uses the separate `playloot-backend` project on port 8787.
