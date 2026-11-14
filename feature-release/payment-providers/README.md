# Payment provider controls

PMS → Payments → Payment providers lets admins add providers and switch each provider, method, deposit direction, and withdrawal direction independently. New providers and methods start disabled. Global method limits and switches still apply.

The existing server payment adapter receives `providerId` in every initiation request, alongside `paymentId`, direction, method, amount and currency. It must route to that provider and use the payment ID as its idempotency key. Signed callbacks must include the same `providerId`; omission is accepted only for the legacy `default` provider. Provider references and callback event IDs are isolated by provider.

Disabling blocks new transactions. Previously accepted requests keep their original provider and may be retried or settled, including refunds. Switching providers on an existing request is forbidden. No existing balance is changed by this migration.

These controls do not connect payment services automatically. The future payment API must support the configured provider IDs. Server credentials and signed callback verification stay in the backend; payments remain unavailable until integration is configured.
