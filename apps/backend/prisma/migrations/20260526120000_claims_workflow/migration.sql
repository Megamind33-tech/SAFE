-- CreateTable
CREATE TABLE "ClaimDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "claimId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "storageKey" TEXT,
    CONSTRAINT "ClaimDocument_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClaimTimelineEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    CONSTRAINT "ClaimTimelineEvent_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "reference" TEXT NOT NULL,
    "tripCoverId" TEXT NOT NULL,
    "passengerUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "description" TEXT NOT NULL DEFAULT '',
    "incidentAt" DATETIME,
    "location" TEXT,
    "injured" BOOLEAN,
    "vehicleInvolved" BOOLEAN,
    "driverDetails" TEXT,
    "policeReference" TEXT,
    "medicalReference" TEXT,
    "vehiclePlate" TEXT,
    "driverPhone" TEXT,
    "trustedContactNote" TEXT,
    CONSTRAINT "Claim_tripCoverId_fkey" FOREIGN KEY ("tripCoverId") REFERENCES "TripCover" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Claim_passengerUserId_fkey" FOREIGN KEY ("passengerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Claim" (
    "id",
    "createdAt",
    "updatedAt",
    "reference",
    "tripCoverId",
    "passengerUserId",
    "status",
    "description",
    "policeReference",
    "medicalReference"
)
SELECT
    "id",
    "createdAt",
    "updatedAt",
    'SAFE-CLM-' || strftime('%Y%m%d', "createdAt") || '-' || upper(substr("id", -4)),
    "tripCoverId",
    "passengerUserId",
    CASE
        WHEN "status" = 'processing' THEN 'under_review'
        ELSE "status"
    END,
    coalesce("description", ''),
    "policeReference",
    "hospitalSlipUrl"
FROM "Claim";
DROP TABLE "Claim";
ALTER TABLE "new_Claim" RENAME TO "Claim";
CREATE UNIQUE INDEX "Claim_reference_key" ON "Claim"("reference");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ClaimDocument_claimId_idx" ON "ClaimDocument"("claimId");

-- CreateIndex
CREATE INDEX "ClaimTimelineEvent_claimId_idx" ON "ClaimTimelineEvent"("claimId");
