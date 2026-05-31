-- Payment hardening: add internal reference, provider reference, confirmation
-- timestamps, and activation source to prevent fraudulent cover activation.

-- SQLite stores enum values as TEXT; adding new enum members (pending_payment,
-- reversed, disputed) requires no SQL — Prisma accepts them at insert time.

-- Payment: unique internal reference generated at purchase time (shown to user).
ALTER TABLE "Payment" ADD COLUMN "internalReference" TEXT;

-- Payment: provider's external reference stored at webhook confirmation for idempotency.
ALTER TABLE "Payment" ADD COLUMN "providerReference" TEXT;

-- Payment: precise confirmation / failure / reversal timestamps.
ALTER TABLE "Payment" ADD COLUMN "confirmedAt" DATETIME;
ALTER TABLE "Payment" ADD COLUMN "failedAt"    DATETIME;
ALTER TABLE "Payment" ADD COLUMN "reversedAt"  DATETIME;

-- TripCover: how the cover was activated (provider_webhook | simulate_dev | manual_admin_override).
ALTER TABLE "TripCover" ADD COLUMN "activationSource" TEXT;

-- Unique index on internalReference (NULLs are distinct in SQLite unique indexes).
CREATE UNIQUE INDEX "Payment_internalReference_key" ON "Payment"("internalReference");

-- Unique index on providerReference — prevents double-processing the same provider callback.
CREATE UNIQUE INDEX "Payment_providerReference_key" ON "Payment"("providerReference");
