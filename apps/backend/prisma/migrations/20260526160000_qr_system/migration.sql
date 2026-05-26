-- QR system: extend QRCode and add QrScanLog

-- CreateTable
CREATE TABLE "QrScanLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "qrCodeId" TEXT,
    "userId" TEXT,
    "result" TEXT NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "approximateLat" REAL,
    "approximateLng" REAL,
    "metadataJson" TEXT,
    CONSTRAINT "QrScanLog_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QRCode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QRCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'vehicle',
    "targetId" TEXT,
    "vehicleId" TEXT,
    "partnerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "expiresAt" DATETIME,
    "lastScannedAt" DATETIME,
    CONSTRAINT "QRCode_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QRCode_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "TransportPartner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QRCode" ("id", "createdAt", "updatedAt", "code", "vehicleId", "isActive", "type", "targetId", "status")
SELECT "id", "createdAt", "updatedAt", "code", "vehicleId", "isActive", 'vehicle', "vehicleId",
  CASE WHEN "isActive" = 1 THEN 'active' ELSE 'disabled' END
FROM "QRCode";
DROP TABLE "QRCode";
ALTER TABLE "new_QRCode" RENAME TO "QRCode";
CREATE UNIQUE INDEX "QRCode_code_key" ON "QRCode"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "QrScanLog_qrCodeId_idx" ON "QrScanLog"("qrCodeId");
CREATE INDEX "QrScanLog_userId_idx" ON "QrScanLog"("userId");
CREATE INDEX "QrScanLog_scannedAt_idx" ON "QrScanLog"("scannedAt");
