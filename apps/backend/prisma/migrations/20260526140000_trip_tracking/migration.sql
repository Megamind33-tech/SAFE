-- CreateTable
CREATE TABLE "TripTracking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tripCoverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "startLat" REAL,
    "startLng" REAL,
    "startLabel" TEXT,
    "currentLat" REAL,
    "currentLng" REAL,
    "currentAccuracy" REAL,
    "currentRecordedAt" DATETIME,
    "endLat" REAL,
    "endLng" REAL,
    "endLabel" TEXT,
    "lastUpdatedAt" DATETIME,
    CONSTRAINT "TripTracking_tripCoverId_fkey" FOREIGN KEY ("tripCoverId") REFERENCES "TripCover" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TripTracking_tripCoverId_key" ON "TripTracking"("tripCoverId");
