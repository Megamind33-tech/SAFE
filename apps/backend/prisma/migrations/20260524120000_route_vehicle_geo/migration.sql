-- AlterTable
ALTER TABLE "Route" ADD COLUMN "originLat" REAL;
ALTER TABLE "Route" ADD COLUMN "originLng" REAL;
ALTER TABLE "Route" ADD COLUMN "destinationLat" REAL;
ALTER TABLE "Route" ADD COLUMN "destinationLng" REAL;
ALTER TABLE "Route" ADD COLUMN "polyline" TEXT;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "lastLat" REAL;
ALTER TABLE "Vehicle" ADD COLUMN "lastLng" REAL;
ALTER TABLE "Vehicle" ADD COLUMN "lastHeading" REAL;
ALTER TABLE "Vehicle" ADD COLUMN "locationAt" DATETIME;
