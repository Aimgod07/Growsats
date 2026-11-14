# Account architecture release

## Data ownership

- `users`: public profile and compatibility fields. Existing password hashes remain during this additive migration; never expose them in PMS.
- `user_authentication`: login credentials (PBKDF2 hashes and salts), signup IP, last successful login IP/time and login count. Existing credentials backfilled; historical IPs are unknown, not fabricated. User credential writes mirror here through triggers; login reads this table.
- `user_activity`: current level, medal (BRONZE initially), achievements, unique play sessions, play seconds, reward count and safe settings. Database triggers refresh snapshots from authoritative activity tables; session duration uses max of claimed and heartbeat seconds to avoid counting twice.
- `wallets`: coins, diamonds, loot, currency and cash minor units. Existing balances and lifetime coins retained. PMS shows incoming amounts since migration and reconciliation differences.
- `transaction_log`: immutable-by-normal-SQL balance deltas, before/after balances, opening entries and zero-amount deposit/withdrawal/reward reference events. Every wallet asset change invokes a trigger. Any wallet/log failure rolls back the statement/transaction. This is an application audit trail, not protection from a database owner deliberately removing triggers.
- `withdrawals`: synchronized with existing redemption records. Existing redemption processing stays intact. No new payment provider or actual cash transfer was introduced.
- `deposits`: admin-confirmed external deposits, unique provider/reference, verification evidence. Insertion credits the wallet atomically once. No client-controlled credit endpoint. Recording a deposit requires independently verifying receipt; this is not a payment gateway.
- `referrals`, `referral_earnings`, `referral_bonus_claims`: each player's code, referrer, direct/invite-code source and individual referral earnings. First-play bonus has an atomic once-only claim. Old bonuses without invitee IDs remain visible in reward history but cannot be reliably attributed. Previously claimed referred players are marked legacy to prevent retroactive double payouts.
- `device_fingerprints`, `user_devices`, `security_events`: hashed app installation identifiers, device details, server-observed Cloudflare IP, account links, login events and a shared-installation trust signal. Credentials and 2FA secrets never appear in operations responses.

## Device interpretation

Trust score 100: no shared installation observed. Score 60: more than one account observed on the installation. Neither is proof of legitimacy or abuse. IP sharing alone does not change the score. No automatic ban or confiscation. Browser/device attributes are untrusted and may be unavailable. Clearing storage/reinstalling can reset installation identity; this cannot guarantee detection of the same physical device across installations. Native manufacturer/model requires the next Android build; no APK generated here. Login displays the collection notice.

## PMS

Three sections: Players & activity, Finance & referrals, Device security. Records are paginated, filterable by player ID, and have full detail panels. Player name/email search supported. Financial logs distinguish balance movements from zero-value reference events. Only authorized PMS requests can read these datasets or record a verified deposit.

## Release and recovery

Migration: `playloot-backend/migrations/0009_account_architecture.sql`.
Generator and SQLite regression tests are in this directory. Run `node build-migration.mjs` after changing migration source, then copy generated SQL into the backend migration before applying. Do not reapply an already committed migration.

Pre-upgrade Cloudflare Time Travel bookmark: `0000006f-0000003c-00005107-d654dc152d68a39fb880e4977a6ecba7` (2026-10-18). Recovery eligibility is subject to Cloudflare retention. No local production data export was created. Restoration would discard later writes and must be separately reviewed.

Production migration history for 0005–0008 was checked against actual table/index definitions before repair. These features had previously been applied without migration-history records.
