-- AlterTable
ALTER TABLE "BillingPeriod" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedById" TEXT,
ADD COLUMN     "isClosed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "deleteReason" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT;

-- CreateIndex
CREATE INDEX "Payment_clientId_amount_paidAt_idx" ON "Payment"("clientId", "amount", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_clientId_deletedAt_idx" ON "Payment"("clientId", "deletedAt");
