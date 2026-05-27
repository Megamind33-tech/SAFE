-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "isSuspended" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SupportReport" ADD COLUMN "adminNote" TEXT;
