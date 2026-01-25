-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "additionalPricePerKm" DOUBLE PRECISION,
ADD COLUMN     "dailyKmsAllowed" DOUBLE PRECISION,
ADD COLUMN     "fylke" TEXT,
ADD COLUMN     "kommune" TEXT,
ADD COLUMN     "priceWithDriver" DOUBLE PRECISION,
ADD COLUMN     "priceWithoutDriver" DOUBLE PRECISION,
ADD COLUMN     "rentWithDriver" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "withDriver" BOOLEAN NOT NULL DEFAULT false;
