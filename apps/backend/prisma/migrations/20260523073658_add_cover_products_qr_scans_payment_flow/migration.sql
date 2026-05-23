-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN "fullName" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN "licenseNumber" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "paidAt" DATETIME;

-- CreateTable
CREATE TABLE "CoverProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZMW',
    "durationMinutes" INTEGER NOT NULL,
    "coverageAmount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "QRScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedByUserId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "qrCodeId" TEXT,
    "result" TEXT NOT NULL DEFAULT 'valid',
    CONSTRAINT "QRScan_scannedByUserId_fkey" FOREIGN KEY ("scannedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QRScan_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QRScan_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QRCode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TripCover" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "passengerUserId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "routeId" TEXT,
    "coverProductId" TEXT,
    "policyNumber" TEXT,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZMW',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME NOT NULL,
    CONSTRAINT "TripCover_passengerUserId_fkey" FOREIGN KEY ("passengerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripCover_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TripCover_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TripCover_coverProductId_fkey" FOREIGN KEY ("coverProductId") REFERENCES "CoverProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TripCover" ("amount", "createdAt", "currency", "endsAt", "id", "passengerUserId", "plan", "routeId", "startedAt", "status", "updatedAt", "vehicleId") SELECT "amount", "createdAt", "currency", "endsAt", "id", "passengerUserId", "plan", "routeId", "startedAt", "status", "updatedAt", "vehicleId" FROM "TripCover";
DROP TABLE "TripCover";
ALTER TABLE "new_TripCover" RENAME TO "TripCover";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
