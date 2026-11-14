# Playloot security audit — 18 October 2026

## Scope and result

Reviewed and changed the Cloudflare backend, user frontend, PMS frontend and Android game WebView source. Deployed backend and both web frontends. This is a source review with regression tests and read-only production checks, not a guarantee that every vulnerability has been eliminated or an independent penetration test.

### Fixed

| Area | Protection implemented |
| --- | --- |
| Daily rewards, missions, spin | Receipt, ledger and wallet update now commit together. Failed writes roll back; simultaneous claims pay once. |
| Play rewards | Coins use recorded heartbeat time instead of elapsed time since opening a session. Session and daily earning limits are checked inside the write. Long heartbeat gaps do not earn idle time. |
| Redemptions | Daily limit and balance checks are atomic. New clients retain a request ID across network failures, so retrying does not charge twice. Older clients remain compatible but need the updated frontend for retry protection. |
| Payment confirmations | Signed callbacks remain the only settlement authority. Provider references are unique and immutable; callback evidence cannot be edited or deleted. Conflicting terminal outcomes cannot reverse settled payments. |
| Withdrawals | Reservations and refunds remain atomic. Refund capacity is preserved. A provider timeout leaves the original request pending/created for retry, rather than assuming failure and refunding a potentially paid withdrawal. |
| Payment frontend | Prevents simultaneous submissions and preserves unresolved request IDs across screen remounts. Older polling responses cannot overwrite newer data. |
| Events and offers | Rules lock once participation/started events make changes financially unsafe. Completed event standings are frozen when finalized, preventing account changes from expanding prize winners. |
| Login and abuse limits | Fixed the failed-login window calculation. Successful login does not erase other IP failures. Added request limits and bounded request bodies. |
| User frontend | Escaped embedded configuration and icon text; rejected unsafe game launch URLs. |
| Android source | HTTPS game URLs only, no file/content access, and no mixed-content loading. |
| PMS/backend | Public HTTPS provider URL checks, redirect refusal, provider fetch timeout, safe error logging, SVG checks retained, strict PMS browser policy and frame protection. |
| Dependencies | Updated vulnerable dependencies, including Capacitor Android 8.5.3, React Router 7.18.4 and Vitest 5.0.5. npm audit reported zero known vulnerabilities in the frontend dependency tree; backend production audit also reported zero. PMS uses the shared installed dependency tree. |

Database transaction design follows [Cloudflare's documented D1 batch rollback behavior](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch). Tests use real SQLite constraints and serialized transactional batches; Cloudflare runtime smoke checks supplement them.

## Verification

- 51 frontend tests passed, including payment retry persistence and PMS payment method editing.
- 33 existing backend tests passed.
- 7 payment integration tests passed against the actual backend source.
- 10 additional security tests passed: write rollback, concurrent claims, earning caps, duplicate redemptions, frozen rankings, throttles, provider-reference reuse, conflicting callbacks, request bounds and literal search.
- User app and PMS production builds passed.
- Production health and both sites return HTTP 200.
- Payment and PMS endpoints reject unauthenticated requests with HTTP 401.
- PMS shows three payment methods and provider readiness remains false.
- Aggregate balances before/after migration are identical: 4 wallets, 24,960 coins, 360 diamonds, 12,850 cash minor units. Coin and cash transaction-log reconciliation found zero mismatches.
- No real payment was submitted during the audit. No production player records were exported.

## Deployment

- Migration: backend `migrations/0011_security.sql` applied to `playloot-db`.
- Backend version: `74675ba6-8c9f-4582-b01f-9c9ea15613b8`.
- User app: https://playloot.pages.dev — deployment https://0addd7d8.playloot.pages.dev.
- PMS: https://playloot-pms.pages.dev — deployment https://8f70c51f.playloot-pms.pages.dev.
- Pre-migration D1 recovery bookmark: `0000006f-00000048-00005107-706acdb4603ebe4235b1007d02c916ad`. Restoring a database can discard later legitimate activity; it is not an automatic rollback step.

## Remaining requirements and limits

1. **Real payment provider integration is still required.** Keep payments disabled until its adapter verifies amount, currency, method, destination and final status; guarantees idempotent payouts; signs callbacks; and is tested for retries, delayed/duplicate callbacks and reconciliation. Refunds/chargebacks after an already successful deposit need an explicit provider-specific reversal/dispute workflow before enabling real money. Never convert an uncertain timeout into a failed payout automatically.
2. **Android needs your next rebuild.** Native source and dependency changes are saved, but no APK was built or installed in this audit. Existing installations retain their previous native behavior until updated.
3. **Heartbeat and browser scores are not proof of human play.** They constrain elapsed-time abuse but can be simulated by modified clients. Unintegrated external browser games without activity reporting no longer earn simply by being left open. Scores remain pending review; high-value automated score awards need game-specific server verification. Installation fingerprints are resettable signals, not reliable hardware identity or account ownership proof.
4. PMS still uses its existing shared admin key. Keep it private and rotate it after suspected exposure. Per-admin accounts, MFA and individual administrative audit trails are future hardening work; this review did not replace the admin authentication system.
5. Payment terminal records deliberately cannot be silently reversed. Contradictory provider outcomes need investigation and an explicit audited correction process. Do not edit balances or terminal payment rows directly to hide a discrepancy.
6. Dependency checks cover published advisories at audit time. They do not prove absence of unknown vulnerabilities. User screen testing and real device verification remain necessary.

## Re-running focused checks

From the user project: `npx vitest run`, `npm run build`, and `node --test feature-release/security/security.test.mjs feature-release/payments/payments.test.mjs`.

From the backend: `node --test src/*.test.js` and `npm audit`.

From the PMS: `npm run build`.
