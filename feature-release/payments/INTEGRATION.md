# Payment adapter integration

The UI and lifecycle are implemented, but no real payment provider has been connected. Production submissions remain disabled by default. Gift cards initially support withdrawals only; PMS can change supported directions after provider capability is confirmed. Crypto amounts and fees must be quoted by the future provider. Wallet cash remains in its existing currency; coins/diamonds are not converted.

Pre-migration in-place Cloudflare recovery bookmark (2026-10-18): `0000006f-00000044-00005107-ec69f3483b0cf75e868c0f2f85a2c6c7`. Recovery is subject to retention and would discard later writes; do not restore automatically.

## Configure only when the adapter exists

Worker secrets: `PAYMENT_API_TOKEN`, `PAYMENT_WEBHOOK_SECRET` (independent high-entropy signing secret). Existing `TWO_STEP_ENCRYPTION_KEY` encrypts payout destinations at rest.

Worker variables: `PAYMENTS_ENABLED=true`, `PAYMENT_API_URL=https://your-adapter.example/payments`, `PAYMENT_CHECKOUT_ORIGINS=https://your-checkout.example` (comma-separated exact origins).

`PAYMENT_API_URL` is a server-side adapter endpoint, not a browser URL. The adapter authenticates bearer `PAYMENT_API_TOKEN` and must enforce the supplied `idempotency-key` across retries.

Request JSON:
```json
{"paymentId":"pay_...","direction":"deposit","methodId":"currency","amountMinor":10000,"currency":"INR","destination":null}
```
Response JSON:
```json
{"reference":"provider-order-123","checkoutUrl":"https://your-checkout.example/order/123"}
```
`checkoutUrl` is optional for server-initiated payouts. It is accepted only for HTTPS origins allowlisted in `PAYMENT_CHECKOUT_ORIGINS`. Provider create responses never settle money. The adapter must handle asset/network/brand selection, rates, fees and user confirmation as appropriate; it must not execute an unquoted cryptocurrency or gift-card payment. The requested `amountMinor` is the amount credited to/debited from wallet cash, not token atomic units.

## Signed status callback

POST `/api/payments/webhook` on the backend Worker, without a player token:
```json
{"eventId":"event-123","paymentId":"pay_...","reference":"provider-order-123","direction":"deposit","methodId":"currency","amountMinor":10000,"currency":"INR","status":"succeeded"}
```
Status is `succeeded` or `failed`. Pending is handled by the initiation flow. Failures must mean definitive failure, not a timeout or unknown processing state. The adapter must verify its upstream provider's signature and payment status before forwarding.

Headers:
- `x-payment-timestamp`: current Unix seconds (5-minute tolerance).
- `x-payment-signature`: hex HMAC-SHA256 using `PAYMENT_WEBHOOK_SECRET` over `timestamp + '.' + exactRawJsonBody`.

Retries retain event ID and identical JSON body but use a fresh timestamp/signature. Event IDs are unique. Duplicate success cannot credit twice; mismatched amount, currency, method, direction or provider reference is rejected. Conflicting terminal events return 409 and require investigation. Refunds/chargebacks and partial settlements need a separate future contract; they must not overwrite a finalized transaction.

## Balance lifecycle

Deposit: create request → pending → signed success inserts a confirmed deposit and atomically credits cash. Signed failure leaves cash unchanged.

Withdrawal: create request atomically reserves cash by deducting available balance → pending → signed success marks paid, with no second debit. Signed failure returns the reserved amount once. `payment_withdrawals` stores separate payment payout records; existing reward redemptions/withdrawals remain unchanged. Every movement and state change is recorded in `transaction_log` with request references. Destinations are not returned to PMS or transaction history.

Ambiguous initiation failures retain `created` status and any withdrawal reservation. The screen offers retry with the same provider idempotency key. Never automatically refund on timeout: the provider may already have accepted the payout. Outstanding requests must be reconciled by the adapter after deployment changes. Five open requests per player and method-specific amount limits are enforced.

The screen polls every 8 seconds while visible and showing an open request. Revisiting or refreshing retrieves the latest state. A browser redirect cannot mark payments successful.
