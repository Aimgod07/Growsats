# Production audit

Completed on 22 November 2026 for the PlayLoot frontend and the active playloot-backend Worker.

## Release status

The checked frontend and backend builds are deployed. General gameplay passed the checks below. Score-based prize competitions require a trusted score verifier and an approval mechanism before payouts can resume. This audit does not establish end-to-end payment-provider readiness or physical iOS and Android compatibility.

## Security fixes

| Finding | Resolution |
| --- | --- |
| Browser-provided scores were automatically approved and could influence coin-prize rankings | New records are pending. Score-prize claims fail closed before leaderboard computation or wallet writes. Existing records remain intact. |
| Invalid session expiry values could bypass the expiry comparison | Invalid and expired values are rejected and the session is removed. |
| Malformed percent-encoded session cookies could throw during authentication | Malformed cookies return an unauthenticated result. |
| Ten frontend dependency advisories, including three high-severity reports | Compatible lockfile updates applied. The frontend and backend npm scans both report zero known vulnerabilities after updates. |
| Browser features and transport security had limited explicit policy | Camera, microphone, geolocation and browser-payment APIs are disabled through Permissions-Policy. HSTS is set. Existing framing and MIME protections are retained. |

## Broken code and cleanup

- Fixed six failing frontend checks. Payment retries are tested against the current withdrawal flow, including retaining the idempotency key after an ambiguous network failure.
- Added accessible screen headings without restoring the removed visual headers.
- Removed the unused WalletActions component and 31 unused game bindings. Initialization calls that construct scene objects are retained.
- Fixed hook dependencies and a callback ref written during render.
- Declared the shared game-script globals in ESLint and excluded vendor assets and local Chrome profiles from lint traversal.
- Ignored local browser-capture artifacts in Git.
- Fixed the dead-code scanner to follow lazy imports. GameCover remains because the cover-generation script consumes it.
- Removed absolute machine paths from payment integration checks. PMS checks run when the sibling source is present or PLAYLOOT_PMS_SOURCE is configured. They are explicitly skipped when PMS is absent.
- Corrected the README to identify the active backend and deployment resources.

## Verification

| Check | Result |
| --- | --- |
| Frontend suite | 28 files, 114 tests passed |
| Payment portability check with PMS present | 4 passed |
| Standalone frontend payment check without PMS | 2 passed, 2 optional PMS integration checks skipped |
| Backend suite including security regressions | 43 passed |
| ESLint | No errors or warnings |
| Vite production build | Passed |
| Worker deployment dry run | Passed |
| Strikepoint weapon and map checks | Passed |
| Cloud Skipper simulation checks | Passed |
| Local game resource references | 1,025 checked, zero missing |
| Browser smoke checks | First Touch, Fruit Frenzy, Goldleaf Run, Groove Grove, Saltwake, Skyline Sprint and Strikepoint captured successfully |
| Public web root and API health | HTTP 200 after deployment |
| Published security headers | Permissions-Policy, HSTS and nosniff confirmed |

## Remaining release work

- Browser scores cannot be authoritative. Implement trusted scoring and a controlled approval path before re-enabling score-prize payouts. Historical automatically approved records require review before they can safely determine prizes.
- Verify payment-provider callbacks, settlement, refunds and reconciliation in the provider sandbox and production setup. Local mocked tests do not establish those external guarantees.
- Exercise the Android build and a physical iPhone, including standalone mode, orientation, sound, reload and low-memory behavior. Browser smoke captures do not prove device performance.
- The build warns about the lazily loaded model-viewer bundle exceeding 500 kB. It is already loaded dynamically. Real device performance remains to be measured.
- This was a source, dependency and regression audit. It was not an exhaustive penetration test. No live financial records or account balances were modified during verification.

## Deployment records

- Frontend deployment is https://890d067c.playloot.pages.dev
- Backend version is 807245ab-0ca6-46cd-8832-3ecf9a8b5bfc
- No database migration was applied.
