-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN "fullName" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN "licenseNumber" TEXT;

-- CreateTable
CREATE TABLE "SavedPaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "maskedValue" TEXT,
    "phoneNumber" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT "SavedPaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SavedPaymentMethod_userId_idx" ON "SavedPaymentMethod"("userId");
